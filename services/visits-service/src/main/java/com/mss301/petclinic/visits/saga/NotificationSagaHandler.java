package com.mss301.petclinic.visits.saga;

import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.events.saga.NotificationAck;
import com.mss301.petclinic.common.events.saga.NotificationFailed;
import com.mss301.petclinic.common.events.saga.SagaStatus;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.events.VisitManualFollowUpRequiredEvent;
import com.mss301.petclinic.visits.model.Visit;
import com.mss301.petclinic.visits.repository.VisitRepository;

/**
 * Saga choreography handler — visits-service đóng vai trò saga initiator + state owner.
 *
 * <h4>Choreography vs Orchestration</h4>
 * Không có orchestrator central. Mỗi service tự lắng nghe event của nhau:
 * <ul>
 *   <li>visits → publish {@code VisitCompletedEvent}</li>
 *   <li>mailer → publish {@code VisitNotifiedEvent} hoặc {@code VisitNotificationFailedEvent}</li>
 *   <li>visits (this class) → consume cả 2 → cập nhật {@link NotificationSaga} +
 *       chạy compensating transaction nếu fail</li>
 * </ul>
 *
 * <h4>Compensating transaction</h4>
 * Khi mailer fail (SMTP down, retry exhausted, recipient bounce vĩnh viễn):
 * <ol>
 *   <li>Saga.markCompensated(reason) — tracking</li>
 *   <li>Publish {@link VisitManualFollowUpRequiredEvent} — trigger admin alert
 *       (ops/vet manual contact khách hàng)</li>
 * </ol>
 * KHÔNG undo Visit.complete() — vet đã khám xong, không thể "uncomplete". Compensation
 * ở đây là <b>mitigation</b> chứ không phải <b>true rollback</b>. Đây là pattern phổ biến
 * cho non-financial sagas — invariant business là "khách phải nhận thông tin sau khám".
 *
 * <h4>Idempotency</h4>
 * Mailer có thể redeliver → mỗi event đi qua {@code repository.findByEventId(originalEventId)}.
 * Nếu saga đã COMPLETED/COMPENSATED → bỏ qua (markCompleted/markCompensated check trong entity).
 *
 * <h4>Why @Transactional</h4>
 * Saga update + publish event nên trong cùng transaction (atomic). RabbitTemplate gửi
 * sau commit qua channelTransacted=false → message vào broker ngay; nếu publish fail
 * sau commit, message lost (chấp nhận cho dev — prod cần transactional outbox).
 */
@Component
public class NotificationSagaHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificationSagaHandler.class);

    private final NotificationSagaRepository sagaRepo;
    private final VisitRepository visitRepo;
    private final RemoteClientsFacade remoteClients;
    private final ObjectProvider<EventPublisher> events;

    public NotificationSagaHandler(NotificationSagaRepository sagaRepo,
                                    VisitRepository visitRepo,
                                    RemoteClientsFacade remoteClients,
                                    ObjectProvider<EventPublisher> events) {
        this.sagaRepo = sagaRepo;
        this.visitRepo = visitRepo;
        this.remoteClients = remoteClients;
        this.events = events;
    }

    /**
     * Happy path — notifier ack sau khi gửi notification OK. Routing key {@code visit.notification.ack}.
     */
    @RabbitListener(queues = "visits.visit.notification.ack")
    @Transactional
    public void onNotificationAck(NotificationAck payload) {
        Optional<NotificationSaga> sagaOpt = sagaRepo.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("NotificationAck không match saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        NotificationSaga saga = sagaOpt.get();
        if (saga.getStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} đã terminal ({}), bỏ qua ack", saga.getId(), saga.getStatus());
            return;
        }
        saga.markCompleted();
        log.info("Saga COMPLETED — visitId={}, recipient={}", payload.entityId(), payload.recipient());
    }

    /**
     * Failure path — notifier fail vĩnh viễn → trigger compensating transaction.
     */
    @RabbitListener(queues = "visits.visit.notification.failed")
    @Transactional
    public void onNotificationFailed(NotificationFailed payload) {
        Optional<NotificationSaga> sagaOpt = sagaRepo.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("NotificationFailed không match saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        NotificationSaga saga = sagaOpt.get();
        if (saga.getStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} đã terminal ({}), bỏ qua failed", saga.getId(), saga.getStatus());
            return;
        }
        saga.markCompensated(payload.errorMessage());
        log.warn("Saga COMPENSATED — visitId={}, error='{}'", payload.entityId(), payload.errorMessage());

        // Compensating action: publish admin alert để ops/vet manual liên hệ khách hàng.
        publishCompensationEvent(payload, saga);
    }

    private void publishCompensationEvent(NotificationFailed payload, NotificationSaga saga) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            log.warn("EventPublisher unavailable — không publish được compensation event cho saga {}",
                    saga.getId());
            return;
        }
        Long visitId;
        try {
            visitId = Long.parseLong(payload.entityId());
        } catch (NumberFormatException ex) {
            log.error("entityId '{}' không phải Long visitId hợp lệ — compensation skip", payload.entityId());
            return;
        }
        Visit visit = visitRepo.findById(visitId).orElse(null);
        if (visit == null) {
            log.error("Visit {} không tồn tại — compensation event skip", visitId);
            return;
        }
        UUID customerId = visit.getCustomerUserId();
        String username = "unknown";
        String email = payload.recipient();      // fallback recipient từ payload
        try {
            UserSummary user = remoteClients.fetchUser(customerId);
            username = user.username();
            email = user.email();
        } catch (RuntimeException ex) {
            log.warn("fetchUser fail trong compensation (visit={}): {}", visitId, ex.getMessage());
        }
        try {
            publisher.publish(VisitManualFollowUpRequiredEvent.of(
                    visitId,
                    payload.originalEventId(),
                    payload.errorMessage(),
                    customerId, username, email));
        } catch (RuntimeException ex) {
            log.error("Publish VisitManualFollowUpRequired fail (visit={}): {}",
                    visitId, ex.getMessage());
        }
    }
}

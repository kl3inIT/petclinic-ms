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
import com.mss301.petclinic.common.events.saga.SagaStepAck;
import com.mss301.petclinic.common.events.saga.SagaStepFailed;
import com.mss301.petclinic.visits.client.RemoteClientsFacade;
import com.mss301.petclinic.visits.client.UserSummary;
import com.mss301.petclinic.visits.events.PrescriptionBillingFollowUpRequiredEvent;
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
 *   <li>billing → publish {@code visit.billing.ack/failed}</li>
 *   <li>mailer → publish {@code visit.notification.ack/failed}</li>
 *   <li>visits (this class) → consume ACK/FAILED → cập nhật saga +
 *       chạy compensating transaction nếu fail</li>
 * </ul>
 *
 * <h4>Compensating transaction</h4>
 * Khi billing hoặc mailer fail:
 * <ol>
 *   <li>Saga.markCompensated(reason) — tracking</li>
 *   <li>Publish {@link VisitManualFollowUpRequiredEvent} — trigger admin alert
 *       (ops/vet manual contact khách hàng)</li>
 * </ol>
 * KHÔNG undo Visit.complete() — vet đã khám xong, không thể "uncomplete". Compensation
 * ở đây là <b>mitigation</b>: staff reconcile invoice hoặc liên hệ khách thủ công.
 *
 * <h4>Idempotency</h4>
 * Billing/mailer có thể redeliver → mỗi event đi qua
 * {@code repository.findByEventId(originalEventId)}. Step đã terminal thì bỏ qua.
 *
 * <h4>Why @Transactional</h4>
 * Saga update + compensation publish nằm cùng method transaction, nhưng AMQP publish vẫn
 * không atomic với DB commit. Production cần transactional outbox.
 */
@Component
public class VisitSagaHandler {

    private static final Logger log = LoggerFactory.getLogger(VisitSagaHandler.class);

    private final VisitCompletionSagaRepository visitCompletionSagas;
    private final PrescriptionBillingSagaRepository prescriptionBillingSagas;
    private final VisitRepository visitRepo;
    private final RemoteClientsFacade remoteClients;
    private final ObjectProvider<EventPublisher> events;

    public VisitSagaHandler(VisitCompletionSagaRepository visitCompletionSagas,
                            PrescriptionBillingSagaRepository prescriptionBillingSagas,
                            VisitRepository visitRepo,
                            RemoteClientsFacade remoteClients,
                            ObjectProvider<EventPublisher> events) {
        this.visitCompletionSagas = visitCompletionSagas;
        this.prescriptionBillingSagas = prescriptionBillingSagas;
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
        Optional<VisitCompletionSaga> sagaOpt = visitCompletionSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("NotificationAck không match saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        VisitCompletionSaga saga = sagaOpt.get();
        if (saga.getNotificationStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} notification step đã terminal ({}), bỏ qua ack",
                    saga.getId(), saga.getNotificationStatus());
            return;
        }
        saga.markNotificationCompleted();
        log.info("Visit completion notification step COMPLETED — visitId={}, recipient={}",
                payload.entityId(), payload.recipient());
    }

    /**
     * Failure path — notifier fail vĩnh viễn → trigger compensating transaction.
     */
    @RabbitListener(queues = "visits.visit.notification.failed")
    @Transactional
    public void onNotificationFailed(NotificationFailed payload) {
        Optional<VisitCompletionSaga> sagaOpt = visitCompletionSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("NotificationFailed không match saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        VisitCompletionSaga saga = sagaOpt.get();
        if (saga.getNotificationStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} notification step đã terminal ({}), bỏ qua failed",
                    saga.getId(), saga.getNotificationStatus());
            return;
        }
        saga.markNotificationCompensated(payload.errorMessage());
        log.warn("Visit completion notification step COMPENSATED — visitId={}, error='{}'",
                payload.entityId(), payload.errorMessage());

        // Compensating action: publish admin alert để ops/vet manual liên hệ khách hàng.
        publishVisitFollowUpEvent(payload.originalEventId(), payload.entityId(), payload.recipient(),
                "Notification failed: " + payload.errorMessage());
    }

    @RabbitListener(queues = "visits.visit.billing.ack")
    @Transactional
    public void onVisitBillingAck(SagaStepAck payload) {
        Optional<VisitCompletionSaga> sagaOpt = visitCompletionSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("Billing ACK không match visit completion saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        VisitCompletionSaga saga = sagaOpt.get();
        if (saga.getBillingStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} billing step đã terminal ({}), bỏ qua ack",
                    saga.getId(), saga.getBillingStatus());
            return;
        }
        saga.markBillingCompleted();
        log.info("Visit completion billing step COMPLETED — visitId={}", payload.entityId());
    }

    @RabbitListener(queues = "visits.visit.billing.failed")
    @Transactional
    public void onVisitBillingFailed(SagaStepFailed payload) {
        Optional<VisitCompletionSaga> sagaOpt = visitCompletionSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("Billing FAILED không match visit completion saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        VisitCompletionSaga saga = sagaOpt.get();
        if (saga.getBillingStatus() != SagaStatus.PENDING) {
            log.debug("Saga {} billing step đã terminal ({}), bỏ qua failed",
                    saga.getId(), saga.getBillingStatus());
            return;
        }
        saga.markBillingCompensated(payload.errorMessage());
        log.warn("Visit completion billing step COMPENSATED — visitId={}, error='{}'",
                payload.entityId(), payload.errorMessage());
        publishVisitFollowUpEvent(payload.originalEventId(), payload.entityId(), null,
                "Billing failed: " + payload.errorMessage());
    }

    @RabbitListener(queues = "visits.prescription.billing.ack")
    @Transactional
    public void onPrescriptionBillingAck(SagaStepAck payload) {
        Optional<PrescriptionBillingSaga> sagaOpt = prescriptionBillingSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("Billing ACK không match prescription saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        PrescriptionBillingSaga saga = sagaOpt.get();
        if (saga.getStatus() != SagaStatus.PENDING) {
            log.debug("Prescription saga {} đã terminal ({}), bỏ qua ack", saga.getId(), saga.getStatus());
            return;
        }
        saga.markCompleted();
        log.info("Prescription billing saga COMPLETED — prescriptionId={}", payload.entityId());
    }

    @RabbitListener(queues = "visits.prescription.billing.failed")
    @Transactional
    public void onPrescriptionBillingFailed(SagaStepFailed payload) {
        Optional<PrescriptionBillingSaga> sagaOpt = prescriptionBillingSagas.findByEventId(payload.originalEventId());
        if (sagaOpt.isEmpty()) {
            log.warn("Billing FAILED không match prescription saga — originalEventId={}, entityId={}",
                    payload.originalEventId(), payload.entityId());
            return;
        }
        PrescriptionBillingSaga saga = sagaOpt.get();
        if (saga.getStatus() != SagaStatus.PENDING) {
            log.debug("Prescription saga {} đã terminal ({}), bỏ qua failed", saga.getId(), saga.getStatus());
            return;
        }
        saga.markCompensated(payload.errorMessage());
        log.warn("Prescription billing saga COMPENSATED — prescriptionId={}, error='{}'",
                payload.entityId(), payload.errorMessage());
        publishPrescriptionBillingFollowUpEvent(saga, payload.errorMessage());
    }

    private void publishVisitFollowUpEvent(UUID originalEventId, String entityId,
                                           String recipient, String reason) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            log.warn("EventPublisher unavailable — không publish được visit follow-up event");
            return;
        }
        Long visitId;
        try {
            visitId = Long.parseLong(entityId);
        } catch (NumberFormatException ex) {
            log.error("entityId '{}' không phải Long visitId hợp lệ — compensation skip", entityId);
            return;
        }
        Visit visit = visitRepo.findById(visitId).orElse(null);
        if (visit == null) {
            log.error("Visit {} không tồn tại — compensation event skip", visitId);
            return;
        }
        UUID customerId = visit.getCustomerUserId();
        String username = "unknown";
        String email = recipient;      // fallback recipient từ payload
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
                    originalEventId,
                    reason,
                    customerId, username, email));
        } catch (RuntimeException ex) {
            log.error("Publish VisitManualFollowUpRequired fail (visit={}): {}",
                    visitId, ex.getMessage());
        }
    }

    private void publishPrescriptionBillingFollowUpEvent(PrescriptionBillingSaga saga, String reason) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null) {
            log.warn("EventPublisher unavailable — không publish được prescription billing follow-up event");
            return;
        }
        Visit visit = visitRepo.findById(saga.getVisitId()).orElse(null);
        if (visit == null) {
            log.error("Visit {} không tồn tại — prescription compensation event skip", saga.getVisitId());
            return;
        }
        UUID customerId = visit.getCustomerUserId();
        String username = "unknown";
        String email = null;
        try {
            UserSummary user = remoteClients.fetchUser(customerId);
            username = user.username();
            email = user.email();
        } catch (RuntimeException ex) {
            log.warn("fetchUser fail trong prescription compensation (visit={}): {}",
                    saga.getVisitId(), ex.getMessage());
        }
        try {
            publisher.publish(PrescriptionBillingFollowUpRequiredEvent.of(
                    saga.getPrescriptionId(),
                    saga.getVisitId(),
                    saga.getEventId(),
                    reason,
                    customerId,
                    username,
                    email));
        } catch (RuntimeException ex) {
            log.error("Publish PrescriptionBillingFollowUpRequired fail (prescription={}): {}",
                    saga.getPrescriptionId(), ex.getMessage());
        }
    }
}

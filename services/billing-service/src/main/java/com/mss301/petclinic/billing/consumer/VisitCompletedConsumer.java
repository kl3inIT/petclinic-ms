package com.mss301.petclinic.billing.consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.billing.model.ProcessedEvent;
import com.mss301.petclinic.billing.repository.ProcessedEventRepository;
import com.mss301.petclinic.billing.service.InvoiceService;
import com.mss301.petclinic.common.events.EventPublisher;
import com.mss301.petclinic.common.events.saga.SagaStepAck;
import com.mss301.petclinic.common.events.saga.SagaStepFailed;

/**
 * Consume {@code visit.completed} → bơm phí khám vào hoá đơn gộp của khách.
 *
 * <h4>Luồng</h4>
 * Visit hoàn tất → visits-service publish {@code VisitCompletedEvent} (kèm fee). Billing
 * tìm/ tạo tab OPEN của khách (theo customerUserId) rồi thêm dòng {@code VISIT_FEE}.
 * Khách ra quầy thanh toán gộp mọi chi phí (phí khám + bệnh + đồ shop) trong 1 hoá đơn.
 *
 * <h4>Idempotency (2 lớp)</h4>
 * <ol>
 *   <li>{@code processed_events} dedupe theo {@code eventId} — broker redeliver bỏ qua.</li>
 *   <li>{@link com.mss301.petclinic.billing.model.Invoice#hasVisitFee} — không bơm trùng
 *       phí cùng visitId ngay cả khi eventId khác.</li>
 * </ol>
 * Check + side-effect + ghi processed_events trong cùng {@code @Transactional} → atomic.
 *
 * <p>Gated {@code petclinic.events.enabled} — test slice (broker off) không đăng ký
 * {@code @RabbitListener} → context load không cần khai báo queue.
 */
@Component
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
public class VisitCompletedConsumer {

    private static final Logger log = LoggerFactory.getLogger(VisitCompletedConsumer.class);

    private final InvoiceService invoiceService;
    private final ProcessedEventRepository processedEvents;
    private final ObjectProvider<EventPublisher> events;

    public VisitCompletedConsumer(InvoiceService invoiceService,
                                  ProcessedEventRepository processedEvents,
                                  ObjectProvider<EventPublisher> events) {
        this.invoiceService = invoiceService;
        this.processedEvents = processedEvents;
        this.events = events;
    }

    @RabbitListener(queues = "billing.visit.completed")
    @Transactional
    public void onVisitCompleted(VisitCompletedPayload event) {
        if (event.eventId() != null && processedEvents.existsById(event.eventId())) {
            log.debug("Event {} đã xử lý — bỏ qua", event.eventId());
            return;
        }
        if (event.customerUserId() == null || event.visitId() == null) {
            log.warn("VisitCompleted thiếu customerUserId/visitId — bỏ qua (visitId={})", event.visitId());
            markFailed(event, "VisitCompleted thiếu customerUserId/visitId");
            markProcessed(event);
            return;
        }

        try {
            invoiceService.appendVisitFee(
                    event.customerUserId(),
                    event.customerUsername(),
                    event.customerEmail(),
                    event.visitId(),
                    event.fee(),
                    buildDescription(event));
            markProcessed(event);
            markAck(event);
        } catch (RuntimeException ex) {
            log.warn("Xử lý VisitCompleted thất bại (visit={}, event={}): {}",
                    event.visitId(), event.eventId(), ex.getMessage());
            markFailed(event, ex.getMessage());
            markProcessed(event);
            return;
        }
        log.info("Đã bơm phí khám visit={} (fee={}) vào hoá đơn khách {}",
                event.visitId(), event.fee(), event.customerUserId());
    }

    private void markProcessed(VisitCompletedPayload event) {
        if (event.eventId() != null && !processedEvents.existsById(event.eventId())) {
            processedEvents.save(new ProcessedEvent(event.eventId()));
        }
    }

    private void markAck(VisitCompletedPayload event) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null || event.eventId() == null) {
            return;
        }
        try {
            publisher.publish(SagaStepAck.of(
                    "visit", "billing", event.eventId(), String.valueOf(event.visitId()),
                    "Visit fee appended to invoice", "billing-service"));
        } catch (RuntimeException ex) {
            log.warn("Publish visit.billing.ack failed (visit={}, event={}): {}",
                    event.visitId(), event.eventId(), ex.getMessage());
        }
    }

    private void markFailed(VisitCompletedPayload event, String errorMessage) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null || event.eventId() == null) {
            return;
        }
        try {
            publisher.publish(SagaStepFailed.of(
                    "visit", "billing", event.eventId(), String.valueOf(event.visitId()),
                    errorMessage != null ? errorMessage : "billing step failed",
                    "billing-service"));
        } catch (RuntimeException ex) {
            log.warn("Publish visit.billing.failed failed (visit={}, event={}): {}",
                    event.visitId(), event.eventId(), ex.getMessage());
        }
    }

    private static String buildDescription(VisitCompletedPayload event) {
        StringBuilder sb = new StringBuilder("Phí khám");
        if (event.petName() != null && !event.petName().isBlank()) {
            sb.append(": ").append(event.petName());
        }
        if (event.diagnosis() != null && !event.diagnosis().isBlank()) {
            sb.append(" — ").append(event.diagnosis());
        }
        return sb.toString();
    }
}

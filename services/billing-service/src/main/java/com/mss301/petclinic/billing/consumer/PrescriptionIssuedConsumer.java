package com.mss301.petclinic.billing.consumer;

import java.util.List;

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
 * Consume {@code prescription.issued} → bơm các dòng thuốc kê đơn vào hoá đơn gộp của khách.
 *
 * <h4>Luồng</h4>
 * Vet kê đơn có thuốc từ catalog → visits-service publish {@code PrescriptionIssuedEvent}
 * (kèm giá snapshot). Billing tìm/tạo tab OPEN của khách (theo customerUserId) rồi thêm
 * các dòng {@code MEDICATION}. Khách thanh toán gộp phí khám + thuốc + bệnh trong 1 hoá đơn.
 *
 * <h4>Idempotency</h4>
 * {@code processed_events} dedupe theo {@code eventId} — broker redeliver bỏ qua. Check +
 * side-effect + ghi processed_events trong cùng {@code @Transactional} → atomic.
 *
 * <p>Gated {@code petclinic.events.enabled} — test slice (broker off) không đăng ký listener.
 */
@Component
@ConditionalOnProperty(prefix = "petclinic.events", name = "enabled", havingValue = "true", matchIfMissing = true)
public class PrescriptionIssuedConsumer {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionIssuedConsumer.class);

    private final InvoiceService invoiceService;
    private final ProcessedEventRepository processedEvents;
    private final ObjectProvider<EventPublisher> events;

    public PrescriptionIssuedConsumer(InvoiceService invoiceService,
                                      ProcessedEventRepository processedEvents,
                                      ObjectProvider<EventPublisher> events) {
        this.invoiceService = invoiceService;
        this.processedEvents = processedEvents;
        this.events = events;
    }

    @RabbitListener(queues = "billing.prescription.issued")
    @Transactional
    public void onPrescriptionIssued(PrescriptionIssuedPayload event) {
        if (event.eventId() != null && processedEvents.existsById(event.eventId())) {
            log.debug("Event {} đã xử lý — bỏ qua", event.eventId());
            return;
        }
        if (event.customerUserId() == null || event.lines() == null || event.lines().isEmpty()) {
            log.warn("PrescriptionIssued thiếu customerUserId/lines — bỏ qua (prescriptionId={})",
                    event.prescriptionId());
            markFailed(event, "PrescriptionIssued thiếu customerUserId/lines");
            markProcessed(event);
            return;
        }

        try {
            List<InvoiceService.MedicationLine> lines = event.lines().stream()
                    .map(l -> new InvoiceService.MedicationLine(
                            l.productId(), l.name(), l.unitPrice(),
                            l.quantity() != null ? l.quantity() : 1))
                    .toList();

            invoiceService.appendMedicationItems(
                    event.customerUserId(), event.customerUsername(), event.prescriptionId(), lines);
            markProcessed(event);
            markAck(event);
        } catch (RuntimeException ex) {
            log.warn("Xử lý PrescriptionIssued thất bại (prescription={}, event={}): {}",
                    event.prescriptionId(), event.eventId(), ex.getMessage());
            markFailed(event, ex.getMessage());
            markProcessed(event);
            return;
        }
        log.info("Đã bơm {} dòng thuốc (prescription={}) vào hoá đơn khách {}",
                event.lines().size(), event.prescriptionId(), event.customerUserId());
    }

    private void markProcessed(PrescriptionIssuedPayload event) {
        if (event.eventId() != null && !processedEvents.existsById(event.eventId())) {
            processedEvents.save(new ProcessedEvent(event.eventId()));
        }
    }

    private void markAck(PrescriptionIssuedPayload event) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null || event.eventId() == null) {
            return;
        }
        try {
            publisher.publish(SagaStepAck.of(
                    "prescription", "billing", event.eventId(), String.valueOf(event.prescriptionId()),
                    "Medication lines appended to invoice", "billing-service"));
        } catch (RuntimeException ex) {
            log.warn("Publish prescription.billing.ack failed (prescription={}, event={}): {}",
                    event.prescriptionId(), event.eventId(), ex.getMessage());
        }
    }

    private void markFailed(PrescriptionIssuedPayload event, String errorMessage) {
        EventPublisher publisher = events.getIfAvailable();
        if (publisher == null || event.eventId() == null) {
            return;
        }
        try {
            publisher.publish(SagaStepFailed.of(
                    "prescription", "billing", event.eventId(), String.valueOf(event.prescriptionId()),
                    errorMessage != null ? errorMessage : "billing step failed",
                    "billing-service"));
        } catch (RuntimeException ex) {
            log.warn("Publish prescription.billing.failed failed (prescription={}, event={}): {}",
                    event.prescriptionId(), event.eventId(), ex.getMessage());
        }
    }
}

package com.mss301.petclinic.billing.consumer;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.billing.model.ProcessedEvent;
import com.mss301.petclinic.billing.repository.ProcessedEventRepository;
import com.mss301.petclinic.billing.service.InvoiceService;

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

    public PrescriptionIssuedConsumer(InvoiceService invoiceService,
                                      ProcessedEventRepository processedEvents) {
        this.invoiceService = invoiceService;
        this.processedEvents = processedEvents;
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
            return;
        }

        List<InvoiceService.MedicationLine> lines = event.lines().stream()
                .map(l -> new InvoiceService.MedicationLine(
                        l.productId(), l.name(), l.unitPrice(),
                        l.quantity() != null ? l.quantity() : 1))
                .toList();

        invoiceService.appendMedicationItems(event.customerUserId(), event.customerUsername(), lines);

        if (event.eventId() != null) {
            processedEvents.save(new ProcessedEvent(event.eventId()));
        }
        log.info("Đã bơm {} dòng thuốc (prescription={}) vào hoá đơn khách {}",
                lines.size(), event.prescriptionId(), event.customerUserId());
    }
}

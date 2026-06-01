package com.mss301.petclinic.billing.consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.billing.model.ProcessedEvent;
import com.mss301.petclinic.billing.repository.ProcessedEventRepository;
import com.mss301.petclinic.billing.service.InvoiceService;

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
 */
@Component
public class VisitCompletedConsumer {

    private static final Logger log = LoggerFactory.getLogger(VisitCompletedConsumer.class);

    private final InvoiceService invoiceService;
    private final ProcessedEventRepository processedEvents;

    public VisitCompletedConsumer(InvoiceService invoiceService,
                                  ProcessedEventRepository processedEvents) {
        this.invoiceService = invoiceService;
        this.processedEvents = processedEvents;
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
            return;
        }

        invoiceService.appendVisitFee(
                event.customerUserId(),
                event.customerUsername(),
                event.visitId(),
                event.fee(),
                buildDescription(event));

        if (event.eventId() != null) {
            processedEvents.save(new ProcessedEvent(event.eventId()));
        }
        log.info("Đã bơm phí khám visit={} (fee={}) vào hoá đơn khách {}",
                event.visitId(), event.fee(), event.customerUserId());
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

package com.mss301.petclinic.visits.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát ra sau khi vet kê đơn thuốc có dòng tham chiếu catalog (có giá).
 * Consumer: billing-service bơm các dòng {@code MEDICATION} vào hoá đơn gộp của khách.
 *
 * <p>Chỉ chứa các dòng ĐÃ CÓ GIÁ (productId + unitPrice + quantity) — thuốc free-text
 * không tính tiền nên không nằm trong event.
 *
 * <p>Routing key: {@code prescription.issued}.
 */
public record PrescriptionIssuedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long prescriptionId,
        Long visitId,

        UUID customerUserId,
        String customerUsername,

        List<Line> lines
) implements DomainEvent {

    /** Một dòng thuốc tính tiền — snapshot tại thời điểm kê. */
    public record Line(
            Long productId,
            String name,
            BigDecimal unitPrice,
            int quantity
    ) {}

    public static PrescriptionIssuedEvent of(Long prescriptionId, Long visitId,
                                             UUID customerUserId, String customerUsername,
                                             List<Line> lines) {
        return new PrescriptionIssuedEvent(
                UUID.randomUUID(),
                "prescription.issued",
                Instant.now(),
                "visits-service",
                prescriptionId, visitId,
                customerUserId, customerUsername,
                lines);
    }
}

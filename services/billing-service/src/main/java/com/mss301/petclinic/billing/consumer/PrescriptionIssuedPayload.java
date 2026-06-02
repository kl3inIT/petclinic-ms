package com.mss301.petclinic.billing.consumer;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Tolerant Reader cho {@code prescription.issued} — chỉ khai báo field billing cần đọc.
 * Jackson bỏ qua field thừa (publisher gửi đầy đủ PrescriptionIssuedEvent). KHÔNG import
 * class event của visits-service.
 */
public record PrescriptionIssuedPayload(
        UUID eventId,
        Long prescriptionId,
        Long visitId,
        UUID customerUserId,
        String customerUsername,
        List<Line> lines
) {
    public record Line(
            Long productId,
            String name,
            BigDecimal unitPrice,
            Integer quantity
    ) {}
}

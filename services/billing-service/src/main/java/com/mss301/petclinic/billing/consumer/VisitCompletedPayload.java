package com.mss301.petclinic.billing.consumer;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Tolerant Reader cho {@code visit.completed} — chỉ khai báo các field billing cần đọc.
 * Jackson bỏ qua field thừa (publisher gửi đầy đủ VisitCompletedEvent). KHÔNG import
 * class event của visits-service → downstream evolve API không vỡ consumer.
 */
public record VisitCompletedPayload(
        UUID eventId,
        Long visitId,
        UUID customerUserId,
        String customerUsername,
        String customerEmail,
        String petName,
        String diagnosis,
        BigDecimal fee
) {
}

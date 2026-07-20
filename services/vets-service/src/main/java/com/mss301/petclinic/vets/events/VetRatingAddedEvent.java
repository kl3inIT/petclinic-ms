package com.mss301.petclinic.vets.events;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát ra sau khi POST /api/v1/vets/{vetId}/ratings tạo rating thành công.
 * Consumer tiềm năng: analytics/KPI tính lại top-rated leaderboard, notification gửi cảm
 * ơn cho customer, billing tính tier-discount khi rating đạt ngưỡng.
 *
 * <p>Routing key: {@code vet.rating.added}.
 *
 * <p>Payload <strong>denormalized chỉ những gì publisher có sẵn</strong> — vetName,
 * customerEmail KHÔNG include vì vets-service không gọi auth/customers (giữ service decoupled).
 * Consumer cần thêm field → callback qua HTTP riêng (Tolerant Reader bên consumer).
 *
 * <p>{@code updated} được giữ để tương thích payload event cũ và luôn là {@code false};
 * rating hiện là bất biến sau khi tạo.
 */
public record VetRatingAddedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long ratingId,
        Long vetId,
        Integer score,
        String description,
        String customerName,
        OffsetDateTime rateDate,
        boolean updated
) implements DomainEvent {

    public static VetRatingAddedEvent of(Long ratingId, Long vetId, Integer score,
                                          String description, String customerName,
                                          OffsetDateTime rateDate, boolean updated) {
        return new VetRatingAddedEvent(
                UUID.randomUUID(),
                "vet.rating.added",
                Instant.now(),
                "vets-service",
                ratingId, vetId, score, description, customerName, rateDate, updated);
    }
}

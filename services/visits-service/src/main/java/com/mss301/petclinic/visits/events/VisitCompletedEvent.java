package com.mss301.petclinic.visits.events;

import com.mss301.petclinic.common.events.DomainEvent;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Phát ra sau khi vet hoàn thành khám.
 * Consumer: mailer-service gửi follow-up + tóm tắt; billing-service tương lai
 * tạo invoice từ {@code fee}.
 *
 * <p>Routing key: {@code visit.completed}.
 */
public record VisitCompletedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long visitId,
        Instant scheduledAt,
        Instant completedAt,

        UUID customerUserId,
        String customerUsername,
        String customerEmail,

        Long petId,
        String petName,

        Long vetId,
        String vetName,

        String diagnosis,
        String treatment,
        BigDecimal fee
) implements DomainEvent {

    public static VisitCompletedEvent of(Long visitId, Instant scheduledAt, Instant completedAt,
                                          UUID customerUserId, String customerUsername, String customerEmail,
                                          Long petId, String petName,
                                          Long vetId, String vetName,
                                          String diagnosis, String treatment, BigDecimal fee) {
        return new VisitCompletedEvent(
                UUID.randomUUID(),
                "visit.completed",
                Instant.now(),
                "visits-service",
                visitId, scheduledAt, completedAt,
                customerUserId, customerUsername, customerEmail,
                petId, petName,
                vetId, vetName,
                diagnosis, treatment, fee);
    }
}

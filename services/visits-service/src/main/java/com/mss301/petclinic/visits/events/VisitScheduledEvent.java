package com.mss301.petclinic.visits.events;

import com.mss301.petclinic.common.events.DomainEvent;

import java.time.Instant;
import java.util.UUID;

/**
 * Phát ra sau khi book lịch khám thành công.
 * Consumer: mailer-service gửi nhắc lịch cho khách + vet queue.
 *
 * <p>Routing key: {@code visit.scheduled}.
 *
 * <p>Payload được <strong>denormalized</strong> tại publish time (visits-service
 * gọi auth/customers/vets clients để enrich) — mailer KHÔNG cần callback.
 */
public record VisitScheduledEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long visitId,
        Instant scheduledAt,
        String reason,

        UUID customerUserId,
        String customerUsername,
        String customerEmail,

        Long petId,
        String petName,

        Long vetId,
        String vetName
) implements DomainEvent {

    public static VisitScheduledEvent of(Long visitId, Instant scheduledAt, String reason,
                                          UUID customerUserId, String customerUsername, String customerEmail,
                                          Long petId, String petName,
                                          Long vetId, String vetName) {
        return new VisitScheduledEvent(
                UUID.randomUUID(),
                "visit.scheduled",
                Instant.now(),
                "visits-service",
                visitId, scheduledAt, reason,
                customerUserId, customerUsername, customerEmail,
                petId, petName,
                vetId, vetName);
    }
}

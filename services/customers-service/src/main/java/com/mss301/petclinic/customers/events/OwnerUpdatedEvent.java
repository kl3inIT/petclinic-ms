package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi cập nhật profile Owner. Consumer: analytics (track edit
 * frequency), mailer (notify contact-info change).
 *
 * <p>Routing key: {@code owner.updated}.
 */
public record OwnerUpdatedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long ownerId,
        String firstName,
        String lastName,
        String city,
        String telephone
) implements DomainEvent {

    public static OwnerUpdatedEvent of(Long ownerId, String firstName, String lastName,
                                       String city, String telephone) {
        return new OwnerUpdatedEvent(
                UUID.randomUUID(),
                "owner.updated",
                Instant.now(),
                "customers-service",
                ownerId, firstName, lastName, city, telephone);
    }
}

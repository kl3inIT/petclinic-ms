package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi tạo Owner thành công. Consumer tiềm năng:
 * mailer-service (welcome onboarding), analytics-service (CRM funnel).
 *
 * <p>Routing key: {@code owner.created}.
 */
public record OwnerCreatedEvent(
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

    public static OwnerCreatedEvent of(Long ownerId, String firstName, String lastName,
                                       String city, String telephone) {
        return new OwnerCreatedEvent(
                UUID.randomUUID(),
                "owner.created",
                Instant.now(),
                "customers-service",
                ownerId, firstName, lastName, city, telephone);
    }
}

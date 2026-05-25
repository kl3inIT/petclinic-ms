package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi thêm Pet vào Owner aggregate. Consumer: mailer (welcome
 * pet onboarding), analytics (new-pet funnel).
 *
 * <p>Routing key: {@code pet.added}.
 */
public record PetAddedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long petId,
        Long ownerId,
        String name,
        String type,
        Long petTypeId
) implements DomainEvent {

    public static PetAddedEvent of(Long petId, Long ownerId, String name,
                                   String type, Long petTypeId) {
        return new PetAddedEvent(
                UUID.randomUUID(),
                "pet.added",
                Instant.now(),
                "customers-service",
                petId, ownerId, name, type, petTypeId);
    }
}

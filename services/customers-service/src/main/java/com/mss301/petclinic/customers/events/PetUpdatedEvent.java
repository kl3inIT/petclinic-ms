package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi cập nhật Pet trong Owner aggregate.
 *
 * <p>Routing key: {@code pet.updated}.
 */
public record PetUpdatedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long petId,
        Long ownerId,
        String name,
        String type,
        Long petTypeId,
        Boolean isActive
) implements DomainEvent {

    public static PetUpdatedEvent of(Long petId, Long ownerId, String name,
                                     String type, Long petTypeId, Boolean isActive) {
        return new PetUpdatedEvent(
                UUID.randomUUID(),
                "pet.updated",
                Instant.now(),
                "customers-service",
                petId, ownerId, name, type, petTypeId, isActive);
    }
}

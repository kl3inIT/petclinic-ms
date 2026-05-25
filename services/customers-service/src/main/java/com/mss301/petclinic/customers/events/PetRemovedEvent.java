package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi xóa Pet khỏi Owner aggregate. Consumer (visits-service)
 * mark visit orphan, không gửi reminder.
 *
 * <p>Routing key: {@code pet.removed}.
 */
public record PetRemovedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long petId,
        Long ownerId
) implements DomainEvent {

    public static PetRemovedEvent of(Long petId, Long ownerId) {
        return new PetRemovedEvent(
                UUID.randomUUID(),
                "pet.removed",
                Instant.now(),
                "customers-service",
                petId, ownerId);
    }
}

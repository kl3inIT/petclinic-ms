package com.mss301.petclinic.customers.events;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát sau khi xoá Owner. <b>Quan trọng:</b> field {@code petIds} chứa toàn
 * bộ pet đã bị cascade xóa — consumer downstream (visits-service) dùng để
 * compensate (mark visit IS_ORPHANED, không thực hiện reminder).
 *
 * <p>Routing key: {@code owner.deleted}.
 */
public record OwnerDeletedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long ownerId,
        List<Long> petIds
) implements DomainEvent {

    public static OwnerDeletedEvent of(Long ownerId, List<Long> petIds) {
        return new OwnerDeletedEvent(
                UUID.randomUUID(),
                "owner.deleted",
                Instant.now(),
                "customers-service",
                ownerId, List.copyOf(petIds));
    }
}

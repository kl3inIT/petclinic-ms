package com.mss301.petclinic.common.events.saga;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Generic ACK envelope for a completed saga participant step.
 *
 * <p>Routing key convention: {@code <domain>.<step>.ack}. Examples:
 * {@code visit.billing.ack}, {@code prescription.billing.ack}.
 */
public record SagaStepAck(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        UUID originalEventId,
        String domain,
        String step,
        String entityId,
        String message
) implements DomainEvent {

    public static SagaStepAck of(String domain, String step, UUID originalEventId,
                                 String entityId, String message, String source) {
        return new SagaStepAck(
                UUID.randomUUID(),
                domain + "." + step + ".ack",
                Instant.now(),
                source,
                originalEventId,
                domain,
                step,
                entityId,
                message);
    }

    @Override
    public String routingKey() {
        return domain + "." + step + ".ack";
    }
}

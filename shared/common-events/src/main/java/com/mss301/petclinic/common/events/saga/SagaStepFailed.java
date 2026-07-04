package com.mss301.petclinic.common.events.saga;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Generic failure envelope for a saga participant step that cannot complete.
 *
 * <p>Routing key convention: {@code <domain>.<step>.failed}. The initiator owns
 * the business compensation.
 */
public record SagaStepFailed(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        UUID originalEventId,
        String domain,
        String step,
        String entityId,
        String errorMessage
) implements DomainEvent {

    public static SagaStepFailed of(String domain, String step, UUID originalEventId,
                                    String entityId, String errorMessage, String source) {
        return new SagaStepFailed(
                UUID.randomUUID(),
                domain + "." + step + ".failed",
                Instant.now(),
                source,
                originalEventId,
                domain,
                step,
                entityId,
                errorMessage);
    }

    @Override
    public String routingKey() {
        return domain + "." + step + ".failed";
    }
}

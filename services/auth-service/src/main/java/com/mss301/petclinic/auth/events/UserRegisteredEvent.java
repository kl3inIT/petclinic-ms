package com.mss301.petclinic.auth.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Phát ra sau khi tạo user thành công.
 * Consumer: mailer-service gửi welcome mail.
 *
 * <p>Routing key: {@code user.registered}.
 */
public record UserRegisteredEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        UUID userId,
        String username,
        String email
) implements DomainEvent {

    public static UserRegisteredEvent of(UUID userId, String username, String email) {
        return new UserRegisteredEvent(
                UUID.randomUUID(),
                "user.registered",
                Instant.now(),
                "auth-service",
                userId, username, email);
    }
}

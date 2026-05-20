package com.mss301.petclinic.visits.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Compensating event — phát ra khi saga "visit.completed.notification" rollback do mailer fail.
 *
 * <p>Consumer (mailer-service hoặc admin channel) phát alert tới ops/vet để liên hệ
 * khách hàng trực tiếp (không qua email tự động).
 *
 * <p>Routing key: {@code visit.manual-followup-required}.
 *
 * <p>Đây là phần "compensating transaction" theo định nghĩa Saga pattern (slide 51) —
 * undo / mitigate khi 1 step phía sau fail.
 */
public record VisitManualFollowUpRequiredEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long visitId,
        UUID originalEventId,             // VisitCompletedEvent.eventId — để trace saga
        String reason,                     // mailer error message
        UUID customerUserId,
        String customerUsername,
        String customerEmail
) implements DomainEvent {

    public static VisitManualFollowUpRequiredEvent of(
            Long visitId, UUID originalEventId, String reason,
            UUID customerUserId, String customerUsername, String customerEmail) {
        return new VisitManualFollowUpRequiredEvent(
                UUID.randomUUID(),
                "visit.manual-followup-required",
                Instant.now(),
                "visits-service",
                visitId, originalEventId, reason,
                customerUserId, customerUsername, customerEmail);
    }
}

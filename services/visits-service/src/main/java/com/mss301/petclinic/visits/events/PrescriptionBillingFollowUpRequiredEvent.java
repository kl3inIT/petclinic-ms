package com.mss301.petclinic.visits.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Compensating event emitted when billing cannot append medication charges for
 * a prescription.
 *
 * <p>The prescription remains valid; staff must reconcile billing manually.
 */
public record PrescriptionBillingFollowUpRequiredEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long prescriptionId,
        Long visitId,
        UUID originalEventId,
        String reason,
        UUID customerUserId,
        String customerUsername,
        String customerEmail
) implements DomainEvent {

    public static PrescriptionBillingFollowUpRequiredEvent of(
            Long prescriptionId, Long visitId, UUID originalEventId, String reason,
            UUID customerUserId, String customerUsername, String customerEmail) {
        return new PrescriptionBillingFollowUpRequiredEvent(
                UUID.randomUUID(),
                "prescription.billing-followup-required",
                Instant.now(),
                "visits-service",
                prescriptionId,
                visitId,
                originalEventId,
                reason,
                customerUserId,
                customerUsername,
                customerEmail);
    }
}

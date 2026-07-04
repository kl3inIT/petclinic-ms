package com.mss301.petclinic.visits.saga;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.events.saga.SagaStatus;

/**
 * Saga state for prescription billing.
 *
 * <p>The prescription is clinical truth and remains valid even when billing
 * cannot append medication items. Compensation is manual billing follow-up.
 */
@Entity
@Table(name = "prescription_billing_sagas")
public class PrescriptionBillingSaga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "prescription_id", nullable = false)
    private Long prescriptionId;

    @Column(name = "visit_id", nullable = false)
    private Long visitId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SagaStatus status;

    @Column(nullable = false)
    private Integer attempts;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PrescriptionBillingSaga() {
        // JPA
    }

    private PrescriptionBillingSaga(UUID eventId, Long prescriptionId, Long visitId) {
        this.eventId = eventId;
        this.prescriptionId = prescriptionId;
        this.visitId = visitId;
        this.status = SagaStatus.PENDING;
        this.attempts = 0;
    }

    public static PrescriptionBillingSaga start(UUID eventId, Long prescriptionId, Long visitId) {
        return new PrescriptionBillingSaga(eventId, prescriptionId, visitId);
    }

    public void markCompleted() {
        if (status != SagaStatus.PENDING) {
            return;
        }
        status = SagaStatus.COMPLETED;
        attempts++;
    }

    public void markCompensated(String reason) {
        if (status != SagaStatus.PENDING) {
            return;
        }
        status = SagaStatus.COMPENSATED;
        lastError = reason;
        attempts++;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public UUID getEventId() { return eventId; }
    public Long getPrescriptionId() { return prescriptionId; }
    public Long getVisitId() { return visitId; }
    public SagaStatus getStatus() { return status; }
    public Integer getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

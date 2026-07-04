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
 * Saga state for the visit completion business flow.
 *
 * <p>Visit completion has two async participants:
 * <ul>
 *   <li>billing-service appends the visit fee to the customer's open invoice</li>
 *   <li>mailer-service notifies the customer that the visit was completed</li>
 * </ul>
 * The visit itself is not rolled back. A failed participant triggers manual
 * follow-up compensation.
 */
@Entity
@Table(name = "visit_completion_sagas")
public class VisitCompletionSaga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "visit_id", nullable = false)
    private Long visitId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SagaStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_status", nullable = false, length = 20)
    private SagaStatus billingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_status", nullable = false, length = 20)
    private SagaStatus notificationStatus;

    @Column(name = "billing_attempts", nullable = false)
    private Integer billingAttempts;

    @Column(name = "notification_attempts", nullable = false)
    private Integer notificationAttempts;

    @Column(name = "last_billing_error", columnDefinition = "TEXT")
    private String lastBillingError;

    @Column(name = "last_notification_error", columnDefinition = "TEXT")
    private String lastNotificationError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected VisitCompletionSaga() {
        // JPA
    }

    private VisitCompletionSaga(UUID eventId, Long visitId) {
        this.eventId = eventId;
        this.visitId = visitId;
        this.status = SagaStatus.PENDING;
        this.billingStatus = SagaStatus.PENDING;
        this.notificationStatus = SagaStatus.PENDING;
        this.billingAttempts = 0;
        this.notificationAttempts = 0;
    }

    public static VisitCompletionSaga start(UUID eventId, Long visitId) {
        return new VisitCompletionSaga(eventId, visitId);
    }

    public void markBillingCompleted() {
        if (billingStatus != SagaStatus.PENDING) {
            return;
        }
        billingStatus = SagaStatus.COMPLETED;
        billingAttempts++;
        refreshOverallStatus();
    }

    public void markBillingCompensated(String reason) {
        if (billingStatus != SagaStatus.PENDING) {
            return;
        }
        billingStatus = SagaStatus.COMPENSATED;
        lastBillingError = reason;
        billingAttempts++;
        refreshOverallStatus();
    }

    public void markNotificationCompleted() {
        if (notificationStatus != SagaStatus.PENDING) {
            return;
        }
        notificationStatus = SagaStatus.COMPLETED;
        notificationAttempts++;
        refreshOverallStatus();
    }

    public void markNotificationCompensated(String reason) {
        if (notificationStatus != SagaStatus.PENDING) {
            return;
        }
        notificationStatus = SagaStatus.COMPENSATED;
        lastNotificationError = reason;
        notificationAttempts++;
        refreshOverallStatus();
    }

    private void refreshOverallStatus() {
        if (billingStatus == SagaStatus.COMPENSATED || notificationStatus == SagaStatus.COMPENSATED) {
            status = SagaStatus.COMPENSATED;
            return;
        }
        if (billingStatus == SagaStatus.COMPLETED && notificationStatus == SagaStatus.COMPLETED) {
            status = SagaStatus.COMPLETED;
        }
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
    public Long getVisitId() { return visitId; }
    public SagaStatus getStatus() { return status; }
    public SagaStatus getBillingStatus() { return billingStatus; }
    public SagaStatus getNotificationStatus() { return notificationStatus; }
    public Integer getBillingAttempts() { return billingAttempts; }
    public Integer getNotificationAttempts() { return notificationAttempts; }
    public String getLastBillingError() { return lastBillingError; }
    public String getLastNotificationError() { return lastNotificationError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

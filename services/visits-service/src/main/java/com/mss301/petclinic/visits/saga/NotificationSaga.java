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
 * State record cho 1 saga instance.
 *
 * <p>Saga choreography KHÔNG có orchestrator central — state lưu phân tán ở service initiator.
 * visits-service vừa publish event vừa giữ NotificationSaga record để track:
 * <ul>
 *   <li>Saga đã COMPLETED chưa? (mailer ack thành công)</li>
 *   <li>Saga đã COMPENSATED chưa? (mail fail → compensating action đã chạy)</li>
 * </ul>
 *
 * <p>{@code eventId} unique = idempotency: nếu mailer redeliver, saga handler chỉ apply 1 lần.
 *
 * <p>Khác Visit (entity nghiệp vụ chính), NotificationSaga là <b>infra/coordination state</b> —
 * KHÔNG expose qua REST API; chỉ dùng internal cho saga handler + monitoring.
 */
@Entity
@Table(name = "notification_sagas")
public class NotificationSaga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** UUID của event gốc (vd VisitCompletedEvent.eventId). Unique → idempotency. */
    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "visit_id", nullable = false)
    private Long visitId;

    /** Loại saga — vd {@code "visit.completed.notification"} cho phép mở rộng tương lai. */
    @Column(name = "saga_type", nullable = false, length = 40)
    private String sagaType;

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

    protected NotificationSaga() {}

    private NotificationSaga(UUID eventId, Long visitId, String sagaType) {
        this.eventId = eventId;
        this.visitId = visitId;
        this.sagaType = sagaType;
        this.status = SagaStatus.PENDING;
        this.attempts = 0;
    }

    public static NotificationSaga start(UUID eventId, Long visitId, String sagaType) {
        return new NotificationSaga(eventId, visitId, sagaType);
    }

    /** Mailer ack thành công → saga hoàn tất happy path. */
    public void markCompleted() {
        if (status != SagaStatus.PENDING) {
            return; // idempotent — đã terminal
        }
        this.status = SagaStatus.COMPLETED;
        this.attempts++;
    }

    /** Mailer fail vĩnh viễn → trigger compensation. {@code reason} ghi log cuối. */
    public void markCompensated(String reason) {
        if (status != SagaStatus.PENDING) {
            return;
        }
        this.status = SagaStatus.COMPENSATED;
        this.lastError = reason;
        this.attempts++;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public UUID getEventId() { return eventId; }
    public Long getVisitId() { return visitId; }
    public String getSagaType() { return sagaType; }
    public SagaStatus getStatus() { return status; }
    public Integer getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

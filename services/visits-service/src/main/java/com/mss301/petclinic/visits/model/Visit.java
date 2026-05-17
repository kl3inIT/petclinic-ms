package com.mss301.petclinic.visits.model;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;
import com.mss301.petclinic.visits.exception.IllegalVisitTransitionException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "visits")
public class Visit extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pet_id", nullable = false)
    private Long petId;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    /** JWT sub của người đặt — dùng để filter "visits của tôi" cho role USER. */
    @Column(name = "customer_user_id", nullable = false)
    private UUID customerUserId;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VisitStatus status;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String treatment;

    @Column(precision = 12, scale = 2)
    private BigDecimal fee;

    @Version
    private Long version;

    protected Visit() {
        // JPA
    }

    private Visit(Long petId, Long vetId, UUID customerUserId, Instant scheduledAt, String reason) {
        this.petId = petId;
        this.vetId = vetId;
        this.customerUserId = customerUserId;
        this.scheduledAt = scheduledAt;
        this.reason = reason;
        this.status = VisitStatus.SCHEDULED;
    }

    /** Factory — chỉ cho phép tạo Visit ở trạng thái SCHEDULED hợp lệ. */
    public static Visit book(Long petId, Long vetId, UUID customerUserId,
                             Instant scheduledAt, String reason) {
        return new Visit(petId, vetId, customerUserId, scheduledAt, reason);
    }

    public void start() {
        transitionTo(VisitStatus.IN_PROGRESS);
    }

    public void complete(String diagnosis, String treatment, BigDecimal fee) {
        transitionTo(VisitStatus.COMPLETED);
        this.diagnosis = diagnosis;
        this.treatment = treatment;
        this.fee = fee;
    }

    public void cancel() {
        transitionTo(VisitStatus.CANCELLED);
    }

    private void transitionTo(VisitStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new IllegalVisitTransitionException(status, next);
        }
        this.status = next;
    }

    // --- getters only — entity state thay đổi qua domain methods, không setter ---

    public Long getId() { return id; }
    public Long getPetId() { return petId; }
    public Long getVetId() { return vetId; }
    public UUID getCustomerUserId() { return customerUserId; }
    public Instant getScheduledAt() { return scheduledAt; }
    public VisitStatus getStatus() { return status; }
    public String getReason() { return reason; }
    public String getDiagnosis() { return diagnosis; }
    public String getTreatment() { return treatment; }
    public BigDecimal getFee() { return fee; }
    public Long getVersion() { return version; }
}

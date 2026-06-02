package com.mss301.petclinic.visits.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;
import com.mss301.petclinic.visits.exception.IllegalVisitTransitionException;

@Entity
@Table(name = "visits")
public class Visit extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pet_id", nullable = false)
    private Long petId;

    /** Snapshot tên thú cưng lúc đặt lịch — hiển thị danh sách không cần gọi customers-service. */
    @Column(name = "pet_name", length = 150)
    private String petName;

    /** Snapshot giống/loài thú cưng lúc đặt lịch (vd "Poodle"). */
    @Column(name = "pet_breed", length = 100)
    private String petBreed;

    /** Snapshot ngày sinh thú cưng — FE tính tuổi hiển thị; null khi pet không khai báo. */
    @Column(name = "pet_birth_date")
    private LocalDate petBirthDate;

    /** Snapshot tên chủ nuôi lúc đặt lịch (best-effort; null nếu lookup thất bại). */
    @Column(name = "owner_name", length = 150)
    private String ownerName;

    /** Snapshot số điện thoại chủ nuôi lúc đặt lịch (best-effort). */
    @Column(name = "owner_phone", length = 30)
    private String ownerPhone;

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

    @Column(name = "process_instance_key")
    private Long processInstanceKey;

    protected Visit() {
        // JPA
    }

    private Visit(Long petId, PetSnapshot pet, OwnerSnapshot owner, Long vetId,
                  UUID customerUserId, Instant scheduledAt, String reason) {
        this.petId = petId;
        this.petName = pet.name();
        this.petBreed = pet.breed();
        this.petBirthDate = pet.birthDate();
        this.ownerName = owner.name();
        this.ownerPhone = owner.phone();
        this.vetId = vetId;
        this.customerUserId = customerUserId;
        this.scheduledAt = scheduledAt;
        this.reason = reason;
        this.status = VisitStatus.SCHEDULED;
    }

    /**
     * Factory — chỉ cho phép tạo Visit ở trạng thái SCHEDULED hợp lệ.
     * Tên/giống/ngày sinh thú cưng + tên/SĐT chủ nuôi được snapshot tại đây (xem {@link PetSnapshot}/{@link OwnerSnapshot}).
     */
    public static Visit book(Long petId, PetSnapshot pet, OwnerSnapshot owner, Long vetId,
                             UUID customerUserId, Instant scheduledAt, String reason) {
        return new Visit(petId, pet, owner, vetId, customerUserId, scheduledAt, reason);
    }

    /** Snapshot thông tin hiển thị của thú cưng lúc đặt lịch (Tolerant Reader từ customers-service). */
    public record PetSnapshot(String name, String breed, LocalDate birthDate) {
    }

    /** Snapshot thông tin liên hệ chủ nuôi lúc đặt lịch (best-effort — field có thể null). */
    public record OwnerSnapshot(String name, String phone) {
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
    public String getPetName() { return petName; }
    public String getPetBreed() { return petBreed; }
    public LocalDate getPetBirthDate() { return petBirthDate; }
    public String getOwnerName() { return ownerName; }
    public String getOwnerPhone() { return ownerPhone; }
    public Long getVetId() { return vetId; }
    public UUID getCustomerUserId() { return customerUserId; }
    public Instant getScheduledAt() { return scheduledAt; }
    public VisitStatus getStatus() { return status; }
    public String getReason() { return reason; }
    public String getDiagnosis() { return diagnosis; }
    public String getTreatment() { return treatment; }
    public BigDecimal getFee() { return fee; }
    public Long getVersion() { return version; }
    public Long getProcessInstanceKey() { return processInstanceKey; }
    public void setProcessInstanceKey(Long processInstanceKey) { this.processInstanceKey = processInstanceKey; }
}

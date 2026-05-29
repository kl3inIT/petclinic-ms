package com.mss301.petclinic.vets.model;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Bằng cấp / đào tạo của một vet. Lifecycle riêng (CRUD qua sub-resource
 * {@code /api/v1/vets/{vetId}/educations}). FK ON DELETE CASCADE — vet bị xoá → educations đi cùng.
 *
 * <p>Khác với Pet (sub-resource của Owner trong customers-service được manage qua aggregate),
 * Education tự manage independent → {@code vet_id} dùng scalar Long với insertable+updatable
 * mặc định (true), KHÔNG cần mirror-FK trick.</p>
 */
@Entity
@Table(name = "educations")
public class Education extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    @Column(name = "school_name", nullable = false, length = 200)
    private String schoolName;

    @Column(nullable = false, length = 100)
    private String degree;

    @Column(name = "field_of_study", length = 150)
    private String fieldOfStudy;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Trạng thái duyệt: PENDING | APPROVED | REJECTED. Vet submit mới → PENDING. */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "reviewed_by", length = 50)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    protected Education() {
        // JPA requires no-arg constructor
    }

    public Education(Long vetId, String schoolName, String degree, LocalDate startDate) {
        this.vetId = vetId;
        this.schoolName = schoolName;
        this.degree = degree;
        this.startDate = startDate;
    }

    public Long getId() { return id; }
    public Long getVetId() { return vetId; }
    public String getSchoolName() { return schoolName; }
    public String getDegree() { return degree; }
    public String getFieldOfStudy() { return fieldOfStudy; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getStatus() { return status; }
    public String getReviewedBy() { return reviewedBy; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public String getRejectReason() { return rejectReason; }

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setSchoolName(String schoolName) { this.schoolName = schoolName; }
    public void setDegree(String degree) { this.degree = degree; }
    public void setFieldOfStudy(String fieldOfStudy) { this.fieldOfStudy = fieldOfStudy; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setStatus(String status) { this.status = status; }

    public void approve(String reviewer) {
        this.status = "APPROVED";
        this.reviewedBy = reviewer;
        this.reviewedAt = OffsetDateTime.now();
        this.rejectReason = null;
    }

    public void reject(String reviewer, String reason) {
        this.status = "REJECTED";
        this.reviewedBy = reviewer;
        this.reviewedAt = OffsetDateTime.now();
        this.rejectReason = reason;
    }
}

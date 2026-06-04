package com.mss301.petclinic.vets.model;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Avatar 1-1 của vet. {@code vet_id} là PK + FK đồng thời (composition strong) —
 * 1 vet chỉ có 1 photo. Re-upload = overwrite (cùng key MinIO + cùng PK DB).
 *
 * <p>Binary nằm ở MinIO key {@code vets/photo/<vetId>}. Entity chỉ giữ metadata.</p>
 */
@Entity
@Table(name = "vet_photo")
public class VetPhoto extends AbstractAuditingEntity {

    @Id
    @Column(name = "vet_id")
    private Long vetId;

    @Column(name = "object_key", nullable = false, length = 255)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    /** Trạng thái duyệt: PENDING | APPROVED | REJECTED. Vet upload mới → PENDING.
     *  Staff/Admin approve → APPROVED, customer mới thấy. CHECK constraint ở DB. */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "reviewed_by", length = 50)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    protected VetPhoto() {
        // JPA requires no-arg constructor
    }

    public VetPhoto(Long vetId, String objectKey, String contentType, Long sizeBytes) {
        this.vetId = vetId;
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    @PrePersist
    void fillUploadedAtIfMissing() {
        if (uploadedAt == null) {
            uploadedAt = OffsetDateTime.now();
        }
    }

    public Long getVetId() { return vetId; }
    public String getObjectKey() { return objectKey; }
    public String getContentType() { return contentType; }
    public Long getSizeBytes() { return sizeBytes; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }
    public String getStatus() { return status; }
    public String getReviewedBy() { return reviewedBy; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public String getRejectReason() { return rejectReason; }

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setObjectKey(String objectKey) { this.objectKey = objectKey; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public void setStatus(String status) { this.status = status; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    /** Mark APPROVED. Reset reject_reason. */
    public void approve(String reviewer) {
        this.status = "APPROVED";
        this.reviewedBy = reviewer;
        this.reviewedAt = OffsetDateTime.now();
        this.rejectReason = null;
    }

    /** Mark REJECTED với lý do. */
    public void reject(String reviewer, String reason) {
        this.status = "REJECTED";
        this.reviewedBy = reviewer;
        this.reviewedAt = OffsetDateTime.now();
        this.rejectReason = reason;
    }
}

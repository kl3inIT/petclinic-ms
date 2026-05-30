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

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setObjectKey(String objectKey) { this.objectKey = objectKey; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}

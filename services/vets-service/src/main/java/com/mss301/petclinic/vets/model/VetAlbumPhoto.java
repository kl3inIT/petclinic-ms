package com.mss301.petclinic.vets.model;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Album photo (1-N) của vet — gallery. Binary đi qua files-service, key
 * {@code vets/album/<vetId>/<photoId>}. Caption optional.
 */
@Entity
@Table(name = "vet_album_photos")
public class VetAlbumPhoto extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    @Column(length = 255)
    private String caption;

    @Column(name = "object_key", nullable = false, length = 255)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    protected VetAlbumPhoto() {
        // JPA requires no-arg constructor
    }

    public VetAlbumPhoto(Long vetId, String contentType, Long sizeBytes) {
        this.vetId = vetId;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    @PrePersist
    void fillUploadedAtIfMissing() {
        if (uploadedAt == null) {
            uploadedAt = OffsetDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getVetId() { return vetId; }
    public String getCaption() { return caption; }
    public String getObjectKey() { return objectKey; }
    public String getContentType() { return contentType; }
    public Long getSizeBytes() { return sizeBytes; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setCaption(String caption) { this.caption = caption; }
    public void setObjectKey(String objectKey) { this.objectKey = objectKey; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}

package com.mss301.petclinic.common.jpa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Mapped superclass cung cấp 4 audit column. Entity extend class này để có audit tự động.
 * Spring Data JPA Auditing wire qua {@link AuditingEntityListener} + {@code AuditorAware} bean
 * (auto-config trong shared/common-jpa).
 *
 * <p>Subclass tự define {@code @Id} của riêng — base KHÔNG ép kiểu ID (cho phép Long, UUID, String).
 *
 * <p>Audit timestamp dùng {@link Instant} (UTC) — KHÔNG dùng {@code LocalDateTime} để tránh timezone bug.
 *
 * <p>KHÔNG implement {@code Serializable} — JPA không bắt buộc, ta không cache entity qua wire
 * (Hazelcast/Redis...). Bỏ giúp giảm [serial] warnings ở mọi subclass entity.</p>
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AbstractAuditingEntity {

    @CreatedBy
    @Column(name = "created_by", length = 50, updatable = false)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private Instant createdDate;

    @LastModifiedBy
    @Column(name = "last_modified_by", length = 50)
    private String lastModifiedBy;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private Instant lastModifiedDate;

    public String getCreatedBy() { return createdBy; }
    public Instant getCreatedDate() { return createdDate; }
    public String getLastModifiedBy() { return lastModifiedBy; }
    public Instant getLastModifiedDate() { return lastModifiedDate; }

    // Setter chỉ exposed cho framework / test. Production code KHÔNG set thủ công.
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public void setCreatedDate(Instant createdDate) { this.createdDate = createdDate; }
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }
    public void setLastModifiedDate(Instant lastModifiedDate) { this.lastModifiedDate = lastModifiedDate; }
}

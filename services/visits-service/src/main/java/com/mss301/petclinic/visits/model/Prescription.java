package com.mss301.petclinic.visits.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Đơn thuốc do bác sĩ kê cho một lần khám. Một visit có thể có NHIỀU đơn (kê nhiều lần
 * trong quá trình điều trị) — {@code visit_id} KHÔNG unique. PDF được sinh khi tạo đơn,
 * lưu trên MinIO; {@code objectKey} trỏ tới object đó (key gồm cả prescriptionId nên không trùng).
 */
@Entity
@Table(name = "prescriptions")
public class Prescription extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id", nullable = false)
    private Long visitId;

    /** vetId (từ JWT claim) của bác sĩ kê đơn — phải là vet phụ trách visit. */
    @Column(name = "issued_by_vet_id", nullable = false)
    private Long issuedByVetId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Key của file PDF trên MinIO (set sau khi sinh + upload PDF). */
    @Column(name = "object_key", length = 255)
    private String objectKey;

    @Column(name = "content_type", length = 50)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrescriptionItem> items = new ArrayList<>();

    protected Prescription() {
        // JPA
    }

    private Prescription(Long visitId, Long issuedByVetId, String notes, Instant issuedAt) {
        this.visitId = visitId;
        this.issuedByVetId = issuedByVetId;
        this.notes = notes;
        this.issuedAt = issuedAt;
    }

    /** Factory — tạo đơn thuốc mới cho visit (chưa có item, chưa có PDF). */
    public static Prescription issue(Long visitId, Long issuedByVetId, String notes) {
        return new Prescription(visitId, issuedByVetId, notes, Instant.now());
    }

    public void addItem(PrescriptionItem item) {
        item.setPrescription(this);
        this.items.add(item);
    }

    /** Gắn metadata PDF sau khi sinh + upload thành công. */
    public void attachPdf(String objectKey, String contentType, long sizeBytes) {
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    // --- getters ---

    public Long getId() { return id; }
    public Long getVisitId() { return visitId; }
    public Long getIssuedByVetId() { return issuedByVetId; }
    public String getNotes() { return notes; }
    public String getObjectKey() { return objectKey; }
    public String getContentType() { return contentType; }
    public Long getSizeBytes() { return sizeBytes; }
    public Instant getIssuedAt() { return issuedAt; }
    public List<PrescriptionItem> getItems() { return Collections.unmodifiableList(items); }
}

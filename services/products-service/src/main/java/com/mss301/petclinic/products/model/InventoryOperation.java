package com.mss301.petclinic.products.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "inventory_operations")
public class InventoryOperation extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, length = 160, unique = true, updatable = false)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 20, updatable = false)
    private InventoryOperationType operationType;

    @Column(name = "source_type", nullable = false, length = 40, updatable = false)
    private String sourceType;

    @Column(name = "source_id", length = 120, updatable = false)
    private String sourceId;

    @Column(length = 255, updatable = false)
    private String reason;

    @Column(name = "request_fingerprint", nullable = false, length = 64, updatable = false)
    private String requestFingerprint;

    protected InventoryOperation() {
        // JPA
    }

    public InventoryOperation(String idempotencyKey, InventoryOperationType operationType,
                              String sourceType, String sourceId, String reason,
                              String requestFingerprint) {
        this.idempotencyKey = idempotencyKey;
        this.operationType = operationType;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.reason = reason;
        this.requestFingerprint = requestFingerprint;
    }

    public Long getId() { return id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public InventoryOperationType getOperationType() { return operationType; }
    public String getSourceType() { return sourceType; }
    public String getSourceId() { return sourceId; }
    public String getReason() { return reason; }
    public String getRequestFingerprint() { return requestFingerprint; }
}

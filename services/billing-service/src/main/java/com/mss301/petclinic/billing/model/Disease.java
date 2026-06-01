package com.mss301.petclinic.billing.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Danh mục bệnh + chi phí điều trị mặc định. Bảng tra cứu — vet/quầy chọn bệnh khi
 * lập hoá đơn, {@link #baseCost} dùng làm đơn giá mặc định cho dòng {@code DISEASE}.
 *
 * <p>Business key = {@link #code} (UNIQUE). {@link #active}=false để ẩn bệnh khỏi danh
 * mục mà không xoá cứng (giữ tham chiếu lịch sử trên hoá đơn cũ).
 */
@Entity
@Table(name = "diseases",
        uniqueConstraints = @UniqueConstraint(name = "uk_diseases_code", columnNames = "code"))
public class Disease extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 80)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "base_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseCost;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    private Long version;

    protected Disease() {
        // JPA
    }

    public Disease(String code, String name, String category, String description, BigDecimal baseCost) {
        this.code = code;
        this.name = name;
        this.category = category;
        this.description = description;
        this.baseCost = baseCost;
        this.active = true;
    }

    /** Partial update — chỉ áp field non-null (PATCH semantics ở service). */
    public void update(String name, String category, String description, BigDecimal baseCost, Boolean active) {
        if (name != null) this.name = name;
        if (category != null) this.category = category;
        if (description != null) this.description = description;
        if (baseCost != null) this.baseCost = baseCost;
        if (active != null) this.active = active;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getBaseCost() { return baseCost; }
    public boolean isActive() { return active; }
    public Long getVersion() { return version; }
}

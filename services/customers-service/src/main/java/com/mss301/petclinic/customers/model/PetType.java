package com.mss301.petclinic.customers.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Catalog loại pet — admin quản lý, FE dropdown.
 * <p>{@code code} là business key bất biến (ví dụ "dog"), {@code name} là label hiển thị,
 * {@code displayOrder} điều khiển thứ tự trong UI.
 */
@Entity
@Table(name = "pet_types")
public class PetType extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 100;

    protected PetType() {
        // JPA requires no-arg constructor
    }

    public PetType(String code, String name, Integer displayOrder) {
        this.code = code;
        this.name = name;
        this.displayOrder = displayOrder == null ? 100 : displayOrder;
    }

    public Long getId() { return id; }
    public Long getVersion() { return version; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public Integer getDisplayOrder() { return displayOrder; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}

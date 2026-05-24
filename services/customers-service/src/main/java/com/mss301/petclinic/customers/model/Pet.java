package com.mss301.petclinic.customers.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "pets")
public class Pet extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private LocalDate birthDate;
    private String type;
    private String petTypeId;
    private Boolean isActive = true;
    private BigDecimal weight;
    private String photoId;

    /**
     * Read-only mirror cho FK <code>owner_id</code> được Hibernate ghi qua
     * Owner.@OneToMany.@JoinColumn. Đặt insertable/updatable=false để tránh write conflict
     * — domain ownership của Pet vẫn là Owner aggregate.
     */
    @Column(name = "owner_id", insertable = false, updatable = false)
    private Long ownerId;

    protected Pet() {
        // JPA requires no-arg constructor
    }

    public Pet(String name, LocalDate birthDate, String type) {
        this(name, birthDate, type, null, true, null, null);
    }

    public Pet(String name, LocalDate birthDate, String type, String petTypeId,
               Boolean isActive, BigDecimal weight, String photoId) {
        this.name = name;
        this.birthDate = birthDate;
        this.type = type;
        this.petTypeId = petTypeId;
        this.isActive = isActive == null ? true : isActive;
        this.weight = weight;
        this.photoId = photoId;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalDate getBirthDate() { return birthDate; }
    public String getType() { return type; }
    public String getPetTypeId() { return petTypeId; }
    public Boolean getIsActive() { return isActive; }
    public BigDecimal getWeight() { return weight; }
    public String getPhotoId() { return photoId; }
    public Long getOwnerId() { return ownerId; }

    public void setName(String name) { this.name = name; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public void setType(String type) { this.type = type; }
    public void setPetTypeId(String petTypeId) { this.petTypeId = petTypeId; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public void setWeight(BigDecimal weight) { this.weight = weight; }
    public void setPhotoId(String photoId) { this.photoId = photoId; }
}

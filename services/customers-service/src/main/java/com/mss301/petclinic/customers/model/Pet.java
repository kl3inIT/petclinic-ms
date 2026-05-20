package com.mss301.petclinic.customers.model;

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
        this.name = name;
        this.birthDate = birthDate;
        this.type = type;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalDate getBirthDate() { return birthDate; }
    public String getType() { return type; }
    public Long getOwnerId() { return ownerId; }

    public void setName(String name) { this.name = name; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public void setType(String type) { this.type = type; }
}

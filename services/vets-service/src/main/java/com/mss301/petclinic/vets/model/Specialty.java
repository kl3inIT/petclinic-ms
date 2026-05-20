package com.mss301.petclinic.vets.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

@Entity
@Table(name = "specialties")
public class Specialty extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    protected Specialty() {
        // JPA requires no-arg constructor
    }

    public Specialty(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }

    public void setName(String name) { this.name = name; }
}

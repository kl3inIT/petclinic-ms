package com.mss301.petclinic.visits.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Một dòng thuốc trong đơn — tên thuốc, liều, tần suất, số ngày dùng, hướng dẫn.
 */
@Entity
@Table(name = "prescription_items")
public class PrescriptionItem extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(name = "medication_name", nullable = false, length = 200)
    private String medicationName;

    @Column(length = 100)
    private String dosage;

    @Column(length = 100)
    private String frequency;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    protected PrescriptionItem() {
        // JPA
    }

    public PrescriptionItem(String medicationName, String dosage, String frequency,
                            Integer durationDays, String instructions) {
        this.medicationName = medicationName;
        this.dosage = dosage;
        this.frequency = frequency;
        this.durationDays = durationDays;
        this.instructions = instructions;
    }

    void setPrescription(Prescription prescription) {
        this.prescription = prescription;
    }

    // --- getters ---

    public Long getId() { return id; }
    public Prescription getPrescription() { return prescription; }
    public String getMedicationName() { return medicationName; }
    public String getDosage() { return dosage; }
    public String getFrequency() { return frequency; }
    public Integer getDurationDays() { return durationDays; }
    public String getInstructions() { return instructions; }
}

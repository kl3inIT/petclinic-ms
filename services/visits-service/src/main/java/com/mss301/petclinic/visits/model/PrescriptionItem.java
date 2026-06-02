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

    /** Tham chiếu catalog products-service — null nếu thuốc free-text ngoài catalog. */
    @Column(name = "product_id")
    private Long productId;

    /** Snapshot đơn giá lúc kê (catalog có thể đổi giá sau) — null nếu free-text. */
    @Column(name = "unit_price", precision = 12, scale = 2)
    private java.math.BigDecimal unitPrice;

    /** Số lượng cấp phát — null nếu free-text (không tính tiền/trừ kho). */
    @Column(name = "quantity")
    private Integer quantity;

    protected PrescriptionItem() {
        // JPA
    }

    /** Thuốc free-text ngoài catalog — chỉ ghi lâm sàng, không tính tiền/trừ kho. */
    public PrescriptionItem(String medicationName, String dosage, String frequency,
                            Integer durationDays, String instructions) {
        this(medicationName, dosage, frequency, durationDays, instructions, null, null, null);
    }

    /** Thuốc từ catalog — kèm productId + đơn giá snapshot + số lượng (tính tiền + trừ kho). */
    public PrescriptionItem(String medicationName, String dosage, String frequency,
                            Integer durationDays, String instructions,
                            Long productId, java.math.BigDecimal unitPrice, Integer quantity) {
        this.medicationName = medicationName;
        this.dosage = dosage;
        this.frequency = frequency;
        this.durationDays = durationDays;
        this.instructions = instructions;
        this.productId = productId;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
    }

    /** Dòng có gắn catalog + giá → tính tiền + nên trừ kho. */
    public boolean isPriced() {
        return productId != null && unitPrice != null && quantity != null && quantity > 0;
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
    public Long getProductId() { return productId; }
    public java.math.BigDecimal getUnitPrice() { return unitPrice; }
    public Integer getQuantity() { return quantity; }
}

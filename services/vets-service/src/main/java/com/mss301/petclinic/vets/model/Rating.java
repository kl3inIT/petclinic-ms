package com.mss301.petclinic.vets.model;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Đánh giá của customer cho vet (1-5 sao). Immutable sau khi tạo (không có PATCH endpoint) —
 * theo pattern Stripe/Amazon: review hiển thị nguyên gốc cho transparency. Muốn xoá → DELETE.
 *
 * <p>FK ON DELETE CASCADE: xoá vet → xoá ratings (consistent với education/work-schedule).
 * Score validate ở 3 layer: DTO @Min/@Max, DB CHECK (1-5), entity field type INTEGER.</p>
 */
@Entity
@Table(name = "ratings")
public class Rating extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    @Column(nullable = false)
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Nhãn đánh giá nhanh (nullable) — customer chọn thay vì gõ description tự do. */
    @Enumerated(EnumType.STRING)
    @Column(name = "predefined_description", length = 20)
    private PredefinedDescription predefinedDescription;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "rate_date", nullable = false)
    private OffsetDateTime rateDate;

    protected Rating() {
        // JPA requires no-arg constructor
    }

    public Rating(Long vetId, Integer score, String customerName) {
        this.vetId = vetId;
        this.score = score;
        this.customerName = customerName;
    }

    @PrePersist
    void fillRateDateIfMissing() {
        // Default = thời điểm tạo. Nếu service set thủ công (vd import legacy data) thì giữ nguyên.
        if (rateDate == null) {
            rateDate = OffsetDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getVetId() { return vetId; }
    public Integer getScore() { return score; }
    public String getDescription() { return description; }
    public PredefinedDescription getPredefinedDescription() { return predefinedDescription; }
    public String getCustomerName() { return customerName; }
    public OffsetDateTime getRateDate() { return rateDate; }

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setScore(Integer score) { this.score = score; }
    public void setDescription(String description) { this.description = description; }
    public void setPredefinedDescription(PredefinedDescription predefinedDescription) { this.predefinedDescription = predefinedDescription; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public void setRateDate(OffsetDateTime rateDate) { this.rateDate = rateDate; }
}

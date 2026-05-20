package com.mss301.petclinic.vets.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Achievement badge của vet. KHÔNG có image bytes (giữ entity gọn) — nếu cần hiển thị
 * icon trên FE, hardcode mapping {@link BadgeTitle} → icon URL/path bên FE.
 * 1 vet có thể nhận cùng badge nhiều lần (vd kỷ niệm năm) → KHÔNG unique constraint.
 */
@Entity
@Table(name = "badges")
public class Badge extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vet_id", nullable = false)
    private Long vetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BadgeTitle title;

    @Column(name = "awarded_date", nullable = false)
    private LocalDate awardedDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    protected Badge() {
        // JPA requires no-arg constructor
    }

    public Badge(Long vetId, BadgeTitle title, LocalDate awardedDate) {
        this.vetId = vetId;
        this.title = title;
        this.awardedDate = awardedDate;
    }

    public Long getId() { return id; }
    public Long getVetId() { return vetId; }
    public BadgeTitle getTitle() { return title; }
    public LocalDate getAwardedDate() { return awardedDate; }
    public String getDescription() { return description; }

    public void setVetId(Long vetId) { this.vetId = vetId; }
    public void setTitle(BadgeTitle title) { this.title = title; }
    public void setAwardedDate(LocalDate awardedDate) { this.awardedDate = awardedDate; }
    public void setDescription(String description) { this.description = description; }
}

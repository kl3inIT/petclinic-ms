package com.mss301.petclinic.vets.dto.req;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.vets.model.Badge;
import com.mss301.petclinic.vets.model.BadgeTitle;

/**
 * Create-badge request body. POST /api/v1/vets/{vetId}/badges — vetId từ path.
 *
 * <p>{@code awardedDate} không được trong tương lai — validate ở service (LocalDate so sánh).
 * Bean Validation {@code @PastOrPresent} không dùng vì khó test deterministic
 * (phụ thuộc thời điểm chạy).</p>
 */
public record BadgeRequest(
        @NotNull BadgeTitle title,
        @NotNull LocalDate awardedDate,
        @Size(max = 2000) String description
) {
    public Badge toEntity(Long vetId) {
        Badge badge = new Badge(vetId, title, awardedDate);
        badge.setDescription(description);
        return badge;
    }
}

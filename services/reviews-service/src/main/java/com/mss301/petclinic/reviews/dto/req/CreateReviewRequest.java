package com.mss301.petclinic.reviews.dto.req;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.reviews.model.Review;
import com.mss301.petclinic.reviews.model.ReviewStatus;
import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Request body cho POST /api/v1/reviews. Service inject authorId + authorName từ JWT —
 * KHÔNG nhận từ FE (chống user giả mạo).
 */
public record CreateReviewRequest(
        @NotNull TargetType targetType,
        @NotNull UUID targetId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String comment
) {

    /** Conversion entity. Service set authorId + authorName + initialStatus. */
    public Review toEntity(UUID authorId, String authorName, ReviewStatus initialStatus) {
        return Review.create(
                targetType,
                targetId,
                authorId,
                authorName,
                rating,
                title,
                comment,
                initialStatus
        );
    }
}

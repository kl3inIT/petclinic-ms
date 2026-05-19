package com.mss301.petclinic.vets.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.vets.model.Rating;

/**
 * Create-rating request body. POST /api/v1/vets/{vetId}/ratings — vetId từ path.
 *
 * <p>Score validate 3 layer: DTO {@code @Min/@Max} (sớm nhất, fail-fast), service không cần
 * check lại, DB CHECK constraint {@code ck_ratings_score} (defense-in-depth — FE bypass
 * validation vẫn không insert được).</p>
 *
 * <p>Phase F: bỏ {@code customerName} client-supplied — giờ controller đọc từ JWT claim
 * {@code username} (auth-service ký vào access token). Client không thể giả mạo identity
 * dù bypass FE validation. Body có field {@code customerName} thừa sẽ bị Jackson silently
 * ignore (default FAIL_ON_UNKNOWN_PROPERTIES=false).</p>
 */
public record RatingRequest(
        @NotNull @Min(1) @Max(5) Integer score,
        @Size(max = 2000) String description
) {
    public Rating toEntity(Long vetId, String customerName) {
        Rating rating = new Rating(vetId, score, customerName);
        rating.setDescription(description);
        return rating;
    }
}

package com.mss301.petclinic.vets.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
 * <p>{@code customerName} tạm thời client-supplied (string từ body). Sau khi tích hợp với
 * auth-service đầy đủ, đổi sang lấy từ {@code JwtAuthenticationToken.getName()} ở service
 * layer + đánh dấu field này deprecated (giữ để backward compat).</p>
 */
public record RatingRequest(
        @NotNull @Min(1) @Max(5) Integer score,
        @Size(max = 2000) String description,
        @NotBlank @Size(max = 100) String customerName
) {
    public Rating toEntity(Long vetId) {
        Rating rating = new Rating(vetId, score, customerName);
        rating.setDescription(description);
        return rating;
    }
}

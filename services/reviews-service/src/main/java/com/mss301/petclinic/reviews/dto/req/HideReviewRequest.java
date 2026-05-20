package com.mss301.petclinic.reviews.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body cho PATCH /api/v1/admin/reviews/{id}/hide — moderator phải ghi lý do (audit trail).
 */
public record HideReviewRequest(
        @NotBlank @Size(max = 500) String reason
) {
}

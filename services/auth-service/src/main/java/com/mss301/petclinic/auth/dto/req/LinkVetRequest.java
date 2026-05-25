package com.mss301.petclinic.auth.dto.req;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Phase K — admin link user account ↔ vet entity của vets-service.
 *
 * <p>Sử dụng cho endpoint {@code PATCH /api/v1/users/{id}/vet-link}. Body
 * {@code {vetId: 1}}. Truyền {@code null} sang endpoint là không hợp lệ — unlink
 * dành cho endpoint riêng (chưa expose vì rủi ro làm mồ côi vet portal session).
 *
 * <p>Validate: {@code vetId} bắt buộc + dương. KHÔNG cross-check existence ở auth
 * (cross-schema lookup không khả thi) — vets-service tự verify khi user gọi
 * {@code /api/v1/vets/me/*}.
 */
public record LinkVetRequest(
        @NotNull(message = "vetId is required")
        @Positive(message = "vetId must be positive")
        Long vetId
) {}

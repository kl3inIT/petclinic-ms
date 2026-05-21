package com.mss301.petclinic.auth.dto.req;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Phase L — admin link user account ↔ customer (owner) entity của customers-service.
 *
 * <p>Sử dụng cho endpoint {@code PATCH /api/v1/users/{id}/customer-link}. Body
 * {@code {customerId: 123}}. Truyền {@code null} sang endpoint là không hợp lệ — muốn
 * unlink thì dùng endpoint riêng (chưa expose vì rủi ro làm mồ côi visit history).
 *
 * <p>Validate: {@code customerId} bắt buộc + dương. KHÔNG cross-check existence ở auth
 * (cross-schema lookup không khả thi) — customers-service tự verify khi consume event.
 */
public record LinkCustomerRequest(
        @NotNull(message = "customerId is required")
        @Positive(message = "customerId must be positive")
        Long customerId
) {}

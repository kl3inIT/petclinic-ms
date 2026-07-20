package com.mss301.petclinic.products.dto.req;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record BatchStockConsumeRequest(
        @NotBlank @Size(max = 160) String idempotencyKey,
        @NotBlank @Size(max = 40) String sourceType,
        @Size(max = 120) String sourceId,
        @Size(max = 255) String reason,
        @NotEmpty @Size(max = 100) List<@Valid Line> items
) {
    public record Line(
            @NotNull @Positive Long productId,
            @NotNull @Positive Integer quantity
    ) {}
}

package com.mss301.petclinic.products.dto.req;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** An audited warehouse receipt or issue document containing one or more lines. */
public record ManualStockDocumentRequest(
        @NotBlank @Size(max = 160) String idempotencyKey,
        @NotNull Direction direction,
        @NotBlank @Size(max = 255) String reason,
        @Size(max = 120) String reference,
        @NotEmpty @Size(max = 100) List<@Valid Line> items
) {
    public enum Direction {
        IN,
        OUT
    }

    public record Line(
            @NotNull @Positive Long productId,
            @NotNull @Positive Integer quantity
    ) {}
}

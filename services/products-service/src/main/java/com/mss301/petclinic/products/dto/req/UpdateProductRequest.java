package com.mss301.petclinic.products.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Partial update mục catalog (ADMIN/INVENTORY_MANAGER) — field null = giữ nguyên. */
public record UpdateProductRequest(
        @Size(max = 150) @Pattern(regexp = ".*\\S.*") String name,
        @Size(max = 80) String category,
        @Size(max = 2000) String description,
        @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal unitPrice,
        @Size(max = 30) String unit,
        @PositiveOrZero Integer stockQuantity,
        @PositiveOrZero Integer reorderLevel,
        Boolean active
) {
}

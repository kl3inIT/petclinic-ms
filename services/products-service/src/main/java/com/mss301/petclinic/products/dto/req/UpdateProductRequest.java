package com.mss301.petclinic.products.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Partial update mục catalog (ADMIN/INVENTORY_MANAGER) — field null = giữ nguyên. */
public record UpdateProductRequest(
        @Size(max = 150) String name,
        @Size(max = 80) String category,
        String description,
        @DecimalMin("0.0") BigDecimal unitPrice,
        @Size(max = 30) String unit,
        @PositiveOrZero Integer stockQuantity,
        @PositiveOrZero Integer reorderLevel,
        Boolean active
) {
}

package com.mss301.petclinic.products.dto.req;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Điều chỉnh tồn kho — số lượng trừ (consume) / nhập thêm (restock). */
public record StockAdjustRequest(
        @NotNull @Positive Integer quantity
) {
}

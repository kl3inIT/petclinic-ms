package com.mss301.petclinic.products.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;

/**
 * Tạo mục catalog mới (ADMIN). {@code stockQuantity}/{@code reorderLevel} bỏ qua nếu
 * type=SERVICE (không quản lý tồn kho).
 */
public record CreateProductRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 80) String category,
        String description,
        @NotNull ProductType type,
        @NotNull @DecimalMin("0.0") BigDecimal unitPrice,
        @Size(max = 30) String unit,
        @PositiveOrZero Integer stockQuantity,
        @PositiveOrZero Integer reorderLevel
) {
    public Product toEntity() {
        return new Product(code, name, category, description, type, unitPrice, unit, stockQuantity, reorderLevel);
    }
}

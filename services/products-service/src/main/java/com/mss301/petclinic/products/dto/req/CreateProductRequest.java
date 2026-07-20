package com.mss301.petclinic.products.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.products.model.Product;
import com.mss301.petclinic.products.model.ProductType;

/**
 * Tạo mục catalog mới (ADMIN/INVENTORY_MANAGER). {@code stockQuantity}/{@code reorderLevel} bỏ qua nếu
 * type=SERVICE (không quản lý tồn kho).
 */
public record CreateProductRequest(
        @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9_]+") String code,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 80) String category,
        @Size(max = 2000) String description,
        @NotNull ProductType type,
        @NotNull @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal unitPrice,
        @Size(max = 30) String unit,
        @PositiveOrZero Integer stockQuantity,
        @PositiveOrZero Integer reorderLevel
) {
    public Product toEntity(Integer initialStock) {
        return new Product(code, name, category, description, type, unitPrice, unit, initialStock, reorderLevel);
    }
}

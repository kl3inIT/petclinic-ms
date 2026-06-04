package com.mss301.petclinic.visits.client;

import java.math.BigDecimal;

/**
 * Local view của Product chỉ chứa field visits cần (Tolerant Reader pattern).
 * products-service có thể thêm field mới — visits không cần recompile.
 *
 * <p>{@code type} so khớp dạng String ("MEDICATION"/"SERVICE"/"SUPPLY") — tránh phụ thuộc
 * enum của downstream.
 */
public record ProductSummary(
        Long id,
        String code,
        String name,
        String type,
        BigDecimal unitPrice,
        String unit,
        Integer stockQuantity,
        boolean active
) {
}

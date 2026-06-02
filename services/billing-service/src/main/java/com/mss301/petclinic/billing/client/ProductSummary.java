package com.mss301.petclinic.billing.client;

import java.math.BigDecimal;

/**
 * Local view của Product từ products-service (Tolerant Reader). Chỉ field billing cần để
 * lập dòng hoá đơn bán lẻ + kiểm tồn kho.
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

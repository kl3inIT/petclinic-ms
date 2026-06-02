package com.mss301.petclinic.products.model;

/**
 * Trạng thái tồn kho — TÍNH ĐỘNG, không lưu DB. Suy ra từ {@code stockQuantity} so với
 * {@code reorderLevel}. SERVICE (không quản lý tồn) trả {@code null}.
 */
public enum StockStatus {
    /** Còn đủ hàng (stock > reorderLevel). */
    AVAILABLE,
    /** Sắp hết — cần nhập thêm (0 < stock ≤ reorderLevel). */
    LOW,
    /** Hết hàng (stock = 0). */
    OUT
}

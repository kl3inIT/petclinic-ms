package com.mss301.petclinic.billing.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Nguồn của một dòng chi phí trên hoá đơn — cho phép gộp nhiều loại chi phí vào 1 hoá đơn.
 *
 * <ul>
 *   <li>{@code VISIT_FEE} — phí khám, bơm tự động từ {@code VisitCompletedEvent} ({@code source_ref}=visitId)</li>
 *   <li>{@code DISEASE}   — điều trị theo bệnh trong danh mục ({@code source_ref}=diseaseId, đơn giá mặc định = baseCost)</li>
 *   <li>{@code PRODUCT}   — sản phẩm shop (dành cho tích hợp products-service sau, {@code source_ref}=productId)</li>
 *   <li>{@code MISC}      — dòng tự do nhập tay tại quầy (đồ shop chưa có catalog, phụ phí…)</li>
 * </ul>
 */
public enum InvoiceItemSource implements IdentifiedEnum {

    VISIT_FEE,
    DISEASE,
    PRODUCT,
    MISC;

    @Override
    public String id() {
        return name();
    }
}

package com.mss301.petclinic.billing.dto.req;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import com.mss301.petclinic.billing.model.InvoiceItemSource;

/**
 * Thêm một dòng vào hoá đơn đang mở.
 *
 * <ul>
 *   <li>{@code DISEASE}: cần {@code sourceRef}=diseaseId. {@code description}/{@code unitPrice}
 *       bỏ trống → mặc định lấy tên + baseCost của bệnh.</li>
 *   <li>{@code MISC}/{@code PRODUCT} (đồ shop nhập tay): cần {@code description} + {@code unitPrice}.</li>
 * </ul>
 */
public record AddInvoiceItemRequest(
        @NotNull InvoiceItemSource sourceType,
        Long sourceRef,
        @Size(max = 255) String description,
        @DecimalMin("0.0") BigDecimal unitPrice,
        @Positive Integer quantity
) {
    public int quantityOrDefault() {
        return quantity != null ? quantity : 1;
    }
}

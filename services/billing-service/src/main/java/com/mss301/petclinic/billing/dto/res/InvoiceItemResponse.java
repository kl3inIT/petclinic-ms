package com.mss301.petclinic.billing.dto.res;

import java.math.BigDecimal;

import com.mss301.petclinic.billing.model.InvoiceItem;
import com.mss301.petclinic.billing.model.InvoiceItemSource;

public record InvoiceItemResponse(
        Long id,
        InvoiceItemSource sourceType,
        Long sourceRef,
        String description,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal
) {
    public static InvoiceItemResponse from(InvoiceItem it) {
        return new InvoiceItemResponse(
                it.getId(), it.getSourceType(), it.getSourceRef(), it.getDescription(),
                it.getUnitPrice(), it.getQuantity(), it.getLineTotal());
    }
}

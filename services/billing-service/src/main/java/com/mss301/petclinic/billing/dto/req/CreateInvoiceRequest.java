package com.mss301.petclinic.billing.dto.req;

import java.util.UUID;

import jakarta.validation.constraints.Size;

/**
 * Mở một hoá đơn (tab) thủ công ở quầy. Cả hai field optional:
 * khách vãng lai mua đồ shop không login → chỉ cần {@code customerName}.
 */
public record CreateInvoiceRequest(
        UUID customerUserId,
        @Size(max = 150) String customerName,
        @Size(max = 100) String customerEmail,
        String notes
) {
}

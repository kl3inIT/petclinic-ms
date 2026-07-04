package com.mss301.petclinic.billing.dto.res;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceStatus;
import com.mss301.petclinic.billing.model.PaymentMethod;

public record InvoiceResponse(
        Long id,
        UUID customerUserId,
        String customerName,
        String customerEmail,
        InvoiceStatus status,
        String currency,
        BigDecimal subtotal,
        BigDecimal total,
        String notes,
        Instant issuedAt,
        Instant paidAt,
        PaymentMethod paymentMethod,
        String paymentReference,
        List<InvoiceItemResponse> items
) {
    public static InvoiceResponse from(Invoice inv) {
        List<InvoiceItemResponse> items = inv.getItems().stream()
                .map(InvoiceItemResponse::from)
                .toList();
        return new InvoiceResponse(
                inv.getId(), inv.getCustomerUserId(), inv.getCustomerName(), inv.getCustomerEmail(),
                inv.getStatus(), inv.getCurrency(), inv.getSubtotal(), inv.getTotal(),
                inv.getNotes(), inv.getIssuedAt(), inv.getPaidAt(), inv.getPaymentMethod(),
                inv.getPaymentReference(), items);
    }
}

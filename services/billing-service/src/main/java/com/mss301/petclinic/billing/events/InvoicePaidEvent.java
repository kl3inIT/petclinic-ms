package com.mss301.petclinic.billing.events;

import java.time.Instant;
import java.util.UUID;

import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.common.events.DomainEvent;

/**
 * Published after checkout succeeds. Mailer consumes it to send payment receipt email.
 *
 * <p>Routing key: {@code invoice.paid}.
 */
public record InvoicePaidEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,

        Long invoiceId,
        UUID customerUserId,
        String customerName,
        String customerEmail,

        String total,
        String currency,
        String paymentMethod,
        String paymentReference,
        Instant paidAt
) implements DomainEvent {

    public static InvoicePaidEvent of(Invoice invoice) {
        return new InvoicePaidEvent(
                UUID.randomUUID(),
                "invoice.paid",
                Instant.now(),
                "billing-service",
                invoice.getId(),
                invoice.getCustomerUserId(),
                invoice.getCustomerName(),
                invoice.getCustomerEmail(),
                invoice.getTotal().toPlainString(),
                invoice.getCurrency(),
                invoice.getPaymentMethod() != null ? invoice.getPaymentMethod().id() : null,
                invoice.getPaymentReference(),
                invoice.getPaidAt());
    }
}

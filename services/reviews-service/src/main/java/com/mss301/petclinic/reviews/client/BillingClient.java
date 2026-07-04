package com.mss301.petclinic.reviews.client;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/** Billing-service lookup used to enforce product review eligibility. */
@HttpExchange(accept = "application/json")
public interface BillingClient {

    @GetExchange("/api/v1/invoices/eligibility/products/{productId}/purchase")
    ProductPurchaseEligibility checkProductPurchase(
            @PathVariable Long productId,
            @RequestParam UUID customerUserId);
}

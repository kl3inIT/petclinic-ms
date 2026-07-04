package com.mss301.petclinic.reviews.client;

import java.util.UUID;

/** Tolerant reader DTO for billing-service product purchase eligibility. */
public record ProductPurchaseEligibility(
        Long productId,
        UUID customerUserId,
        boolean eligible
) {
}

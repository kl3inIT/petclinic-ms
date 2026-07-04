package com.mss301.petclinic.billing.dto.res;

import java.util.UUID;

/** Result for review-service purchase eligibility checks. */
public record ProductPurchaseEligibilityResponse(
        Long productId,
        UUID customerUserId,
        boolean eligible
) {
}

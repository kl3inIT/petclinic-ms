package com.mss301.petclinic.billing.dto.req;

import jakarta.validation.constraints.NotNull;

import com.mss301.petclinic.billing.model.PaymentMethod;

/** Chốt + thanh toán hoá đơn ở quầy. */
public record CheckoutRequest(
        @NotNull PaymentMethod paymentMethod
) {
}

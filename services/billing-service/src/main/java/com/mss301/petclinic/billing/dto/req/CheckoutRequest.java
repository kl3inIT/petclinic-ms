package com.mss301.petclinic.billing.dto.req;

import jakarta.validation.constraints.NotNull;

import com.mss301.petclinic.billing.model.PaymentMethod;

/**
 * Chốt + thanh toán hoá đơn TRỰC TIẾP tại quầy (CASH/CARD/TRANSFER).
 *
 * <p>Thanh toán ONLINE (khách tự nhập thẻ, cổng thanh toán) — <b>Coming soon</b>,
 * chưa triển khai. Khi làm sẽ thêm thông tin thẻ + xác thực qua payment gateway thật.
 */
public record CheckoutRequest(
        @NotNull PaymentMethod paymentMethod
) {
}

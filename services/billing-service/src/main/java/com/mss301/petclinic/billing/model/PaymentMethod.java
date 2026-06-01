package com.mss301.petclinic.billing.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/** Hình thức thanh toán khi chốt hoá đơn ở quầy. */
public enum PaymentMethod implements IdentifiedEnum {

    CASH,
    CARD,
    TRANSFER;

    @Override
    public String id() {
        return name();
    }
}

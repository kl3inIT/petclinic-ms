package com.mss301.petclinic.reviews.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Loại đối tượng được review. Mỗi review thuộc về EXACTLY 1 target.
 * <ul>
 *   <li>{@link #VET} — review bác sĩ sau khi visit COMPLETED (eligibility check qua VisitsClient)</li>
 *   <li>{@link #PRODUCT} — review sản phẩm sau khi invoice PAID (eligibility skip v1 — chưa có billing-service)</li>
 *   <li>{@link #VISIT} — review toàn bộ trải nghiệm visit (1 visit chỉ 1 review)</li>
 * </ul>
 *
 * <p>Stored as VARCHAR(20) — DB CHECK constraint trong Liquibase 004.
 */
public enum TargetType implements IdentifiedEnum {

    VET,
    PRODUCT,
    VISIT;

    @Override
    public String id() {
        return name();
    }
}

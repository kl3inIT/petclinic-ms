package com.mss301.petclinic.vets.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Ngày trong tuần. {@link #id()} trả {@link #name()} → DB lưu trực tiếp tên enum
 * qua {@code @Enumerated(EnumType.STRING)}, consistent với id().
 *
 * <p>Workday không có thứ tự nghiệp vụ (Monday không "trước" Friday theo cách
 * mà status có thứ tự) → KHÔNG implement {@link com.mss301.petclinic.common.jpa.enums.OrderedEnum}.
 * Nếu cần sort trên FE thì map theo natural ordinal của Java enum (Monday=0, ...).</p>
 */
public enum Workday implements IdentifiedEnum {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY;

    @Override
    public String id() {
        return name();
    }
}

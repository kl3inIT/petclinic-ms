package com.mss301.petclinic.reviews.model;

import com.mss301.petclinic.common.jpa.enums.IdentifiedEnum;

/**
 * Loại vote trên review. User có thể flip giữa 2 giá trị (HELPFUL ↔ NOT_HELPFUL)
 * — upsert được handle ở {@code ReviewServiceImpl.vote()}.
 *
 * <p>Denorm count: chỉ {@link #HELPFUL} được aggregate vào {@code Review.helpful_count}.
 * NOT_HELPFUL chỉ lưu để chống re-vote, không hiển thị trên UI (anti-griefing).
 */
public enum VoteType implements IdentifiedEnum {

    HELPFUL,
    NOT_HELPFUL;

    @Override
    public String id() {
        return name();
    }
}

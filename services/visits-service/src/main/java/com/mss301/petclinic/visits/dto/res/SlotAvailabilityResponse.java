package com.mss301.petclinic.visits.dto.res;

import java.util.List;

/**
 * Trả về số lượng ca khám đã book (active = SCHEDULED + IN_PROGRESS) cho từng
 * khung giờ của 1 vet vào 1 ngày. FE dùng để hiển thị "Còn X slot" / "Đã đầy"
 * trên booking page.
 *
 * <p>{@code capacity} = {@link com.mss301.petclinic.visits.service.impl.VisitServiceImpl#SLOT_CAPACITY}
 * (hiện = 2). {@code remaining = capacity - taken}.
 */
public record SlotAvailabilityResponse(int capacity, List<SlotInfo> slots) {

    /**
     * @param workHour mã enum dạng {@code HOUR_8_9}, {@code HOUR_9_10}, ...
     * @param taken    số ca đã đặt (SCHEDULED/IN_PROGRESS)
     * @param remaining số ca còn trống
     */
    public record SlotInfo(String workHour, int taken, int remaining) {}
}

package com.mss301.petclinic.vets.dto.res;

import jakarta.validation.constraints.NotNull;

import com.mss301.petclinic.vets.model.WorkHour;
import com.mss301.petclinic.vets.model.WorkScheduleSlot;
import com.mss301.petclinic.vets.model.Workday;

/**
 * Slot DTO dùng cho cả request item (qua {@code WorkScheduleRequest.slots}) và response.
 * Enum value gửi-nhận = name() (vd "MONDAY", "HOUR_8_9"). Jackson tự bind/serialize.
 *
 * <p>Invalid enum value (typo) → Jackson trả 400 {@code HttpMessageNotReadableException}
 * → ProblemDetail (Spring Boot 4 auto-handle). KHÔNG cần custom converter.</p>
 */
public record WorkScheduleSlotResponse(
        @NotNull Workday workday,
        @NotNull WorkHour workHour
) {
    public static WorkScheduleSlotResponse from(WorkScheduleSlot slot) {
        return new WorkScheduleSlotResponse(slot.getWorkday(), slot.getWorkHour());
    }
}

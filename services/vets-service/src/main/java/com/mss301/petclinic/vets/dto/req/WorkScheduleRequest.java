package com.mss301.petclinic.vets.dto.req;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;

/**
 * PUT body cho replace toàn bộ lịch trực. Wrap trong object (KHÔNG dùng raw array body)
 * để future-proof — thêm field như {@code effectiveFrom}, {@code timezone} sau này
 * không break clients hiện có.
 *
 * <p>{@code slots} non-null required nhưng <strong>empty list cho phép</strong> = clear all
 * (semantically tương đương DELETE nhưng route qua PUT để đồng nhất "PUT replace").</p>
 */
public record WorkScheduleRequest(
        @NotNull @Valid List<WorkScheduleSlotResponse> slots
) {}

package com.mss301.petclinic.reviews.dto.res;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import com.mss301.petclinic.reviews.model.TargetType;

/**
 * Aggregate stats cho 1 target: count + avg + distribution 1..5.
 *
 * <p>{@code distribution} luôn đủ 5 key (1, 2, 3, 4, 5) — service fill 0 cho rating chưa có
 * review. FE không phải null-check từng key khi render histogram.
 *
 * <p>{@code average} null khi {@code count == 0} (không có review nào) — tránh trả về 0.0
 * gây hiểu nhầm "rating thấp" thay vì "chưa có review".
 */
public record ReviewSummaryResponse(
        TargetType targetType,
        UUID targetId,
        Long count,
        BigDecimal average,
        Map<Integer, Long> distribution
) {
}

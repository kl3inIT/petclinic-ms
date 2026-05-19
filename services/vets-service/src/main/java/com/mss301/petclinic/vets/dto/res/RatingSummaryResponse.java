package com.mss301.petclinic.vets.dto.res;

import java.util.Map;

/**
 * Summary aggregate cho ratings của 1 vet.
 *
 * @param count        total số rating
 * @param average      average score (null nếu count = 0 — KHÔNG dùng 0.0 vì gây nhầm với "vet được rate 0 sao",
 *                     mà CHECK constraint không cho phép)
 * @param distribution map score → count, luôn có đủ 5 key (1..5), value = 0 nếu không có rating
 *                     ở score đó (giúp FE vẽ chart không phải defensive null-check)
 */
public record RatingSummaryResponse(
        long count,
        Double average,
        Map<Integer, Long> distribution
) {}

package com.mss301.petclinic.reviews.client;

import java.util.UUID;

/**
 * Local view của Visit (Tolerant Reader). visits-service có thể thêm field mới — reviews
 * KHÔNG cần recompile. Chỉ giữ field eligibility check thật sự cần.
 *
 * <p>{@code status} là String thay vì enum để tránh coupling enum giữa 2 service —
 * service caller so sánh bằng string literal {@code "COMPLETED"}.
 */
public record VisitSummary(
        Long id,
        Long petId,
        Long vetId,
        UUID customerUserId,
        String status
) {
}

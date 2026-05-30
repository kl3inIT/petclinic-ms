package com.mss301.petclinic.vets.dto.res;

/**
 * Cross-vet aggregate: 1 row = 1 vet với metrics rating của họ. Trả cho endpoint
 * {@code GET /api/v1/vets/top-rated} — standalone (KHÔNG nested dưới {vetId}) vì
 * scope là toàn bộ vets, không thuộc 1 vet cụ thể.
 */
public record TopRatedVetResponse(
        Long vetId,
        String firstName,
        String lastName,
        long ratingCount,
        Double averageScore
) {}

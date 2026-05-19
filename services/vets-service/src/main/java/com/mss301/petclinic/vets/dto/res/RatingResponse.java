package com.mss301.petclinic.vets.dto.res;

import java.time.OffsetDateTime;

import com.mss301.petclinic.vets.model.Rating;

public record RatingResponse(
        Long id,
        Long vetId,
        Integer score,
        String description,
        String customerName,
        OffsetDateTime rateDate
) {
    public static RatingResponse from(Rating r) {
        return new RatingResponse(
                r.getId(),
                r.getVetId(),
                r.getScore(),
                r.getDescription(),
                r.getCustomerName(),
                r.getRateDate()
        );
    }
}

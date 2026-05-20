package com.mss301.petclinic.vets.dto.res;

import java.time.LocalDate;

import com.mss301.petclinic.vets.model.Badge;
import com.mss301.petclinic.vets.model.BadgeTitle;

public record BadgeResponse(
        Long id,
        Long vetId,
        BadgeTitle title,
        LocalDate awardedDate,
        String description
) {
    public static BadgeResponse from(Badge b) {
        return new BadgeResponse(
                b.getId(), b.getVetId(), b.getTitle(), b.getAwardedDate(), b.getDescription());
    }
}

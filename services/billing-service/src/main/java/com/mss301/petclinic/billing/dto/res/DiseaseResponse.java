package com.mss301.petclinic.billing.dto.res;

import java.math.BigDecimal;

import com.mss301.petclinic.billing.model.Disease;

public record DiseaseResponse(
        Long id,
        String code,
        String name,
        String category,
        String description,
        BigDecimal baseCost,
        boolean active
) {
    public static DiseaseResponse from(Disease d) {
        return new DiseaseResponse(
                d.getId(), d.getCode(), d.getName(), d.getCategory(),
                d.getDescription(), d.getBaseCost(), d.isActive());
    }
}

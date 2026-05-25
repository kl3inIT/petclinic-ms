package com.mss301.petclinic.customers.dto.res;

import com.mss301.petclinic.customers.model.PetType;

public record PetTypeResponse(Long id, String code, String name, Integer displayOrder) {
    public static PetTypeResponse from(PetType petType) {
        return new PetTypeResponse(
                petType.getId(),
                petType.getCode(),
                petType.getName(),
                petType.getDisplayOrder());
    }
}

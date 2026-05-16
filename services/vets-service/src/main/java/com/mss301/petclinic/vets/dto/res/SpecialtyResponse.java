package com.mss301.petclinic.vets.dto.res;

import com.mss301.petclinic.vets.model.Specialty;

public record SpecialtyResponse(Long id, String name) {

    public static SpecialtyResponse from(Specialty specialty) {
        return new SpecialtyResponse(specialty.getId(), specialty.getName());
    }
}

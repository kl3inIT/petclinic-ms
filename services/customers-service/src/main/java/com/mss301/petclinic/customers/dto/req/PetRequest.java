package com.mss301.petclinic.customers.dto.req;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;

import com.mss301.petclinic.customers.model.Pet;

public record PetRequest(
        @NotBlank String name,
        @PastOrPresent LocalDate birthDate,
        @NotBlank String type
) {
    public Pet toEntity() {
        return new Pet(name, birthDate, type);
    }
}

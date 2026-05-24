package com.mss301.petclinic.customers.dto.req;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;

import com.mss301.petclinic.customers.model.Pet;

public record PetRequest(
        @NotBlank String name,
        @PastOrPresent LocalDate birthDate,
        @NotBlank String type,
        String petTypeId,
        Boolean isActive,
        @DecimalMin("0.0") BigDecimal weight,
        String photoId
) {
    public Pet toEntity() {
        return new Pet(name, birthDate, type, petTypeId, isActive, weight, photoId);
    }
}

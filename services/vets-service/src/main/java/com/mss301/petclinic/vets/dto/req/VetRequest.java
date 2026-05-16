package com.mss301.petclinic.vets.dto.req;

import com.mss301.petclinic.vets.model.Vet;
import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record VetRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        Set<String> specialtyNames    // Tham chiếu specialty bằng tên — service tìm hoặc throw nếu không tồn tại
) {
    public Vet toEntity() {
        return new Vet(firstName, lastName);
    }
}

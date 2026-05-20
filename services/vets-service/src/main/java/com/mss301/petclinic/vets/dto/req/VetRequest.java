package com.mss301.petclinic.vets.dto.req;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;

import com.mss301.petclinic.vets.model.Vet;

public record VetRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        Set<String> specialtyNames    // Tham chiếu specialty bằng tên — service tìm hoặc throw nếu không tồn tại
) {
    public Vet toEntity() {
        return new Vet(firstName, lastName);
    }
}

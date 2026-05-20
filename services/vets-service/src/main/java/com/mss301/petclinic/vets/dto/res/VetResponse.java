package com.mss301.petclinic.vets.dto.res;

import java.util.List;
import java.util.Set;

import com.mss301.petclinic.vets.model.Vet;

public record VetResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        boolean active,
        String resume,
        List<SpecialtyResponse> specialties
) {
    public static VetResponse from(Vet vet) {
        var specs = (vet.getSpecialties() == null ? Set.<com.mss301.petclinic.vets.model.Specialty>of() : vet.getSpecialties())
                .stream()
                .map(SpecialtyResponse::from)
                .sorted(java.util.Comparator.comparing(SpecialtyResponse::name))
                .toList();
        return new VetResponse(
                vet.getId(),
                vet.getFirstName(),
                vet.getLastName(),
                vet.getEmail(),
                vet.getPhoneNumber(),
                vet.isActive(),
                vet.getResume(),
                specs
        );
    }
}

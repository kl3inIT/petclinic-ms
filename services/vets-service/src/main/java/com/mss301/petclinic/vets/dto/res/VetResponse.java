package com.mss301.petclinic.vets.dto.res;

import java.util.List;
import java.util.Set;

import com.mss301.petclinic.vets.model.Vet;

public record VetResponse(
        Long id,
        String cardCode,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String vetBillId,
        boolean active,
        String resume,
        List<SpecialtyResponse> specialties,
        String photoUrl,
        Double averageRating
) {
    public static VetResponse from(Vet vet, String photoUrl, Double averageRating) {
        var specs = (vet.getSpecialties() == null ? Set.<com.mss301.petclinic.vets.model.Specialty>of() : vet.getSpecialties())
                .stream()
                .map(SpecialtyResponse::from)
                .sorted(java.util.Comparator.comparing(SpecialtyResponse::name))
                .toList();
        return new VetResponse(
                vet.getId(),
                vet.getCardCode(),
                vet.getFirstName(),
                vet.getLastName(),
                vet.getEmail(),
                vet.getPhoneNumber(),
                vet.getVetBillId(),
                vet.isActive(),
                vet.getResume(),
                specs,
                photoUrl,
                averageRating
        );
    }
}

package com.mss301.petclinic.customers.dto.res;

import java.time.LocalDate;

import com.mss301.petclinic.customers.model.Pet;

/**
 * Standalone Pet response — exposed cho cross-service consumers (vd visits-service)
 * cần validate pet tồn tại + lấy ownerId.
 */
public record PetResponse(
        Long id,
        String name,
        LocalDate birthDate,
        String type,
        Long ownerId
) {
    public static PetResponse from(Pet pet) {
        return new PetResponse(pet.getId(), pet.getName(), pet.getBirthDate(),
                pet.getType(), pet.getOwnerId());
    }
}

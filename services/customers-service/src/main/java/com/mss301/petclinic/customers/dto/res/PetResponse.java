package com.mss301.petclinic.customers.dto.res;

import com.mss301.petclinic.customers.model.Pet;

import java.time.LocalDate;

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

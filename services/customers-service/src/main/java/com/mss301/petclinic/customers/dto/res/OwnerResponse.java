package com.mss301.petclinic.customers.dto.res;

import java.time.LocalDate;
import java.util.List;

import com.mss301.petclinic.customers.model.Owner;
import com.mss301.petclinic.customers.model.Pet;

public record OwnerResponse(
        Long id,
        String firstName,
        String lastName,
        String address,
        String city,
        String telephone,
        List<PetDto> pets
) {
    public static OwnerResponse from(Owner owner) {
        var pets = owner.getPets() == null
                ? List.<PetDto>of()
                : owner.getPets().stream().map(PetDto::from).toList();
        return new OwnerResponse(
                owner.getId(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getAddress(),
                owner.getCity(),
                owner.getTelephone(),
                pets
        );
    }

    public record PetDto(Long id, String name, LocalDate birthDate, String type) {
        public static PetDto from(Pet pet) {
            return new PetDto(pet.getId(), pet.getName(), pet.getBirthDate(), pet.getType());
        }
    }
}

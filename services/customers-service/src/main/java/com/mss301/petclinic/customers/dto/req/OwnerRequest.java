package com.mss301.petclinic.customers.dto.req;

import jakarta.validation.constraints.NotBlank;

import com.mss301.petclinic.customers.model.Owner;

public record OwnerRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String address,
        String city,
        String telephone
) {
    public Owner toEntity() {
        return new Owner(firstName, lastName, address, city, telephone);
    }
}

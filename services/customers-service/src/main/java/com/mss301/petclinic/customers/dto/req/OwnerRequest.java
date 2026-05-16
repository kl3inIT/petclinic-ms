package com.mss301.petclinic.customers.dto.req;

import com.mss301.petclinic.customers.model.Owner;
import jakarta.validation.constraints.NotBlank;

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

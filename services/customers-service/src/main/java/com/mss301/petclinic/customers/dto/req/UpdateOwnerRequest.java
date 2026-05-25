package com.mss301.petclinic.customers.dto.req;

/**
 * Partial owner update. Null means "keep current value"; blank optional fields
 * are normalized by the service.
 */
public record UpdateOwnerRequest(
        String firstName,
        String lastName,
        String address,
        String city,
        String telephone
) {
}

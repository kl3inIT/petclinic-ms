package com.mss301.petclinic.auth.dto.req;

import java.util.Set;

/**
 * Admin patch user account and authorization assignment.
 *
 * <p>All fields optional. {@code roles} replaces the complete role set when present.
 */
public record AdminUpdateUserRequest(
        Set<String> roles,
        Boolean enabled,
        Long vetId,
        Long customerId
) {
    public boolean hasRoles() {
        return roles != null;
    }

    public boolean hasEnabled() {
        return enabled != null;
    }

    public boolean hasVetId() {
        return vetId != null;
    }

    public boolean hasCustomerId() {
        return customerId != null;
    }
}

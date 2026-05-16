package com.mss301.petclinic.auth.dto.res;

import com.mss301.petclinic.auth.model.User;

import java.util.Set;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        Set<String> roles,
        boolean enabled
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getEmail(), u.getRoles(), u.isEnabled());
    }
}

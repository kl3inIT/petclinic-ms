package com.mss301.petclinic.auth.dto.res;

import java.util.Set;
import java.util.UUID;

/**
 * Login response — OAuth2-ish format (tokenType + expiresIn + accessToken).
 * Refresh token thêm ở Iter 3.
 */
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,             // seconds
        UUID userId,
        String username,
        Set<String> roles
) {
    public static AuthResponse bearer(String token, long expiresInSeconds, UUID userId, String username, Set<String> roles) {
        return new AuthResponse(token, "Bearer", expiresInSeconds, userId, username, roles);
    }
}

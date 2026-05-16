package com.mss301.petclinic.auth.dto.res;

import java.util.Set;
import java.util.UUID;

/**
 * Login/refresh response — OAuth2-ish format. Access token = JWT RS256.
 * Refresh token = opaque random hex (256-bit), reference vào DB.
 */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,             // seconds (access token TTL)
        long refreshExpiresIn,      // seconds (refresh token TTL)
        UUID userId,
        String username,
        Set<String> roles
) {
    public static AuthResponse of(String access, long accessTtl, String refresh, long refreshTtl,
                                  UUID userId, String username, Set<String> roles) {
        return new AuthResponse(access, refresh, "Bearer", accessTtl, refreshTtl, userId, username, roles);
    }
}

package com.mss301.petclinic.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * Auth-service riêng config — token TTLs. Immutable record với defaults qua {@code @DefaultValue}.
 *
 * <p>Tách khỏi {@code PetClinicJwtProperties} (shared) vì các value này chỉ auth-service dùng
 * (sign tokens). Cùng prefix root {@code petclinic.auth.*}.</p>
 */
@ConfigurationProperties(prefix = "petclinic.auth")
public record AuthProperties(
        /** Access token (JWT) TTL. */
        @DefaultValue("PT15M") Duration accessTokenTtl,
        /** Refresh token (opaque) TTL. */
        @DefaultValue("P7D") Duration refreshTokenTtl
) {
}

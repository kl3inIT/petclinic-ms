package com.mss301.petclinic.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Auth-service riêng config — token TTLs. Immutable record với defaults qua {@code @DefaultValue}.
 *
 * <p>Tách khỏi {@code PetClinicJwtProperties} (shared) vì các value này chỉ auth-service dùng
 * (sign tokens). Cùng prefix root {@code petclinic.auth.*}.</p>
 *
 * @param accessTokenTtl  access token (JWT) TTL, default 15 phút
 * @param refreshTokenTtl refresh token (opaque) TTL, default 7 ngày
 */
@ConfigurationProperties(prefix = "petclinic.auth")
public record AuthProperties(
        @DefaultValue("PT15M") Duration accessTokenTtl,
        @DefaultValue("P7D") Duration refreshTokenTtl
) {
}

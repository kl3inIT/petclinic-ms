package com.mss301.petclinic.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Auth-service riêng config — token TTLs.
 *
 * <p>Tách khỏi {@code PetClinicJwtProperties} (shared) vì các value này chỉ auth-service dùng
 * (sign tokens), services khác chỉ verify. Cùng prefix root {@code petclinic.auth.*} giữ semantic
 * hierarchy: {@code petclinic.auth.jwt.*} = shared validation, {@code petclinic.auth.*} = issuer-only.</p>
 *
 * <p>Bound qua {@link AuthPropertiesConfiguration} (cũng package này).</p>
 */
@ConfigurationProperties(prefix = "petclinic.auth")
public class AuthProperties {

    /** Access token (JWT) TTL. Default 15 phút. */
    private Duration accessTokenTtl = Duration.ofMinutes(15);

    /** Refresh token (opaque) TTL. Default 7 ngày. */
    private Duration refreshTokenTtl = Duration.ofDays(7);

    public Duration getAccessTokenTtl() { return accessTokenTtl; }
    public void setAccessTokenTtl(Duration accessTokenTtl) { this.accessTokenTtl = accessTokenTtl; }
    public Duration getRefreshTokenTtl() { return refreshTokenTtl; }
    public void setRefreshTokenTtl(Duration refreshTokenTtl) { this.refreshTokenTtl = refreshTokenTtl; }
}

package com.mss301.petclinic.common.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Common JWT properties — dùng JWKS endpoint, không secret. Immutable record (Spring Boot 3+
 * binding tự pick canonical constructor).
 *
 * <p>Auth-service exposes {@code /.well-known/jwks.json}. Mọi service (gateway/customers/vets/...)
 * fetch public keys từ đó để verify token. Nimbus cache theo {@code Cache-Control} header.</p>
 */
@ConfigurationProperties(prefix = "petclinic.auth.jwt")
public record PetClinicJwtProperties(
        String jwkSetUri,
        @DefaultValue("petclinic-ms") String issuer,
        @DefaultValue("petclinic-ms") String audience
) {
}

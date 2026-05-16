package com.mss301.petclinic.common.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Common JWT properties — dùng JWKS endpoint, không secret.
 *
 * <p>Auth-service exposes {@code /.well-known/jwks.json}. Mọi service (gateway/customers/vets/...)
 * fetch public keys từ đó để verify token. Spring Security cache JWKS theo {@code Cache-Control}
 * header (Nimbus tự handle).</p>
 */
@ConfigurationProperties(prefix = "petclinic.auth.jwt")
public class PetClinicJwtProperties {

    /**
     * Full URL to JWKS endpoint. Dev: {@code http://localhost:8183/.well-known/jwks.json}.
     * Prod: env-driven (k8s DNS hoặc service mesh hostname).
     */
    private String jwkSetUri;

    /** Expected issuer claim. Validated bởi NimbusJwtDecoder. */
    private String issuer = "petclinic-ms";

    /** Expected audience claim. */
    private String audience = "petclinic-ms";

    public String getJwkSetUri() { return jwkSetUri; }
    public void setJwkSetUri(String jwkSetUri) { this.jwkSetUri = jwkSetUri; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }
}

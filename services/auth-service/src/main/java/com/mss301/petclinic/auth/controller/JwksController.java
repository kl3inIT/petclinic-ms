package com.mss301.petclinic.auth.controller;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nimbusds.jose.jwk.JWKSet;

/**
 * Publishes JWKS (JSON Web Key Set) — public keys cho mọi service verify JWT.
 * Endpoint chuẩn theo OIDC: {@code /.well-known/jwks.json}.
 *
 * <p>Response chỉ chứa PUBLIC key (n, e, kid, alg). Private key KHÔNG bao giờ rời auth-service.</p>
 *
 * <p>Spring Security caches qua Nimbus's default cache (5min). Khi rotate key, services tự pick up
 * sau cache expire.</p>
 */
@RestController
public class JwksController {

    private final JWKSet jwkSet;

    public JwksController(JWKSet jwkSet) {
        this.jwkSet = jwkSet;
    }

    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> jwks() {
        // toJSONObject(true) → chỉ public params (loại bỏ private key components d, p, q, ...)
        return jwkSet.toJSONObject(true);
    }
}

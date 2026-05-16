package com.mss301.petclinic.auth.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

/**
 * RSA keypair source.
 *
 * <h4>Dev pattern</h4>
 * Generate fresh 2048-bit RSA keypair at app startup → stored in-memory. Restart =
 * mọi access token cũ invalidate (refresh token vẫn dùng được vì lưu DB). Đơn giản, an toàn
 * cho học/dev. {@code kid} random UUID — services thấy kid mới qua JWKS auto refresh.
 *
 * <h4>Prod pattern (chưa apply)</h4>
 * Load PEM private key từ env var {@code JWT_PRIVATE_KEY_PEM} (k8s Secret/Vault). Key rotation:
 * generate new keypair, hai key cùng publish trong JWKS một thời gian, drop old khi all tokens expire.
 */
@Configuration
public class RsaKeyConfig {

    private static final Logger log = LoggerFactory.getLogger(RsaKeyConfig.class);

    @Bean
    public RSAKey rsaJwk() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            var kp = kpg.generateKeyPair();
            String kid = UUID.randomUUID().toString();
            log.info("Generated RSA-2048 signing keypair for auth-service. kid={}", kid);
            return new RSAKey.Builder((RSAPublicKey) kp.getPublic())
                    .privateKey((RSAPrivateKey) kp.getPrivate())
                    .keyID(kid)
                    .build();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA not available", e);
        }
    }

    /** JWKSet wrap quanh RSAKey — exposed cả ở JwksController và JwtEncoder. */
    @Bean
    public JWKSet jwkSet(RSAKey rsaJwk) {
        return new JWKSet(rsaJwk);
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(JWKSet jwkSet) {
        return new ImmutableJWKSet<>(jwkSet);
    }
}

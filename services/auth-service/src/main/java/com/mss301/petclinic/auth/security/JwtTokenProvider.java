package com.mss301.petclinic.auth.security;

import com.mss301.petclinic.auth.config.AuthProperties;
import com.mss301.petclinic.auth.model.User;
import com.mss301.petclinic.common.security.jwt.PetClinicJwtProperties;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Encode RS256 JWT access tokens.
 *
 * <h4>Claims</h4>
 * <ul>
 *   <li>{@code iss} = "petclinic-ms"</li>
 *   <li>{@code aud} = "petclinic-ms" (single audience — Iter sau có thể per-service)</li>
 *   <li>{@code sub} = user UUID</li>
 *   <li>{@code username}, {@code roles}, {@code iat}, {@code exp}</li>
 * </ul>
 *
 * <h4>Header</h4>
 * {@code alg=RS256, kid=<rsa key id>} — services lookup public key qua kid trong JWKS.
 */
@Component
public class JwtTokenProvider {

    private final JwtEncoder jwtEncoder;
    private final RSAKey rsaJwk;
    private final PetClinicJwtProperties jwtProps;
    private final Duration accessTokenTtl;

    public JwtTokenProvider(
            JwtEncoder jwtEncoder,
            RSAKey rsaJwk,
            PetClinicJwtProperties jwtProps,
            AuthProperties authProps
    ) {
        this.jwtEncoder = jwtEncoder;
        this.rsaJwk = rsaJwk;
        this.jwtProps = jwtProps;
        this.accessTokenTtl = authProps.getAccessTokenTtl();
    }

    public IssuedToken issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTokenTtl);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtProps.getIssuer())
                .audience(List.of(jwtProps.getAudience()))
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("username", user.getUsername())
                .claim("roles", user.getRoles())
                .build();

        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256)
                .keyId(rsaJwk.getKeyID())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, accessTokenTtl.toSeconds());
    }

    public record IssuedToken(String token, long expiresInSeconds) {}
}

package com.mss301.petclinic.auth.security;

import com.mss301.petclinic.auth.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Encode JWT access token.
 *
 * <h4>Claims</h4>
 * <ul>
 *   <li>{@code iss} — "petclinic-ms" (constant). Services validate audience matches.</li>
 *   <li>{@code sub} — user UUID (string). Public-safe identifier.</li>
 *   <li>{@code username} — convenience claim cho UI hiển thị (KHÔNG là identity key).</li>
 *   <li>{@code roles} — array of "USER"/"VET"/"ADMIN". Spring Security JwtAuthenticationConverter
 *       sẽ map sang ROLE_USER/ROLE_VET/ROLE_ADMIN authorities.</li>
 *   <li>{@code iat}, {@code exp} — issued at + expires (15 min default).</li>
 * </ul>
 *
 * <h4>Crypto (Iter 1)</h4>
 * HS256 (HMAC SHA-256). Secret shared qua config-repo. Iter 3 chuyển sang RS256 + JWKS.
 */
@Component
public class JwtTokenProvider {

    public static final String ISSUER = "petclinic-ms";

    private final JwtEncoder jwtEncoder;
    private final Duration tokenTtl;

    public JwtTokenProvider(
            JwtEncoder jwtEncoder,
            @Value("${petclinic.auth.jwt.access-token-ttl:PT15M}") Duration tokenTtl
    ) {
        this.jwtEncoder = jwtEncoder;
        this.tokenTtl = tokenTtl;
    }

    public IssuedToken issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenTtl);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .audience(java.util.List.of(ISSUER))
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("username", user.getUsername())
                .claim("roles", user.getRoles())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, tokenTtl.toSeconds());
    }

    public record IssuedToken(String token, long expiresInSeconds) {}
}

package com.mss301.petclinic.auth.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/**
 * Spring Security 7 config — lambda DSL only.
 *
 * <h4>What's new in Security 7 (đã apply)</h4>
 * <ul>
 *   <li>{@code authorizeHttpRequests} (NOT {@code authorizeRequests} — removed)</li>
 *   <li>Lambda style mọi nơi — {@code .and()} đã bị remove</li>
 *   <li>{@code PathPatternRequestMatcher} implicit qua String pattern</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                // Stateless REST API — no CSRF, no session
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Public — đăng ký/đăng nhập KHÔNG cần auth (oxymoron)
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login").permitAll()
                        // Actuator health public cho k8s probe; metrics/info xem ở mgmt port riêng (9183)
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Springdoc public — Swagger UI dev
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated()
                )

                // JWT Bearer authentication — protected endpoints check token tự động
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)));

        return http.build();
    }

    /**
     * BCrypt 12 rounds — slow enough để chống brute-force (~200ms/hash trên CPU hiện đại),
     * vẫn fast enough cho login UX.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * HS256 encoder — sign tokens với shared secret.
     * Iter 3 sẽ swap sang RSA: {@code new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaJwk)))}.
     */
    @Bean
    public JwtEncoder jwtEncoder(@Value("${petclinic.auth.jwt.secret}") String secret) {
        SecretKey key = hmacKey(secret);
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    /**
     * HS256 decoder — verify token signature trên chính auth-service (Iter 1: validate /me endpoint).
     * Iter 2 sẽ extract sang shared/common-security để mọi service dùng chung.
     */
    @Bean
    public JwtDecoder jwtDecoder(@Value("${petclinic.auth.jwt.secret}") String secret) {
        SecretKey key = hmacKey(secret);
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    /**
     * Convert {@code roles} claim (String array) → Spring Security authorities {@code ROLE_*}.
     * {@code @PreAuthorize("hasRole('ADMIN')")} sẽ match {@code roles: ["ADMIN"]} trong JWT.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter granted = new JwtGrantedAuthoritiesConverter();
        granted.setAuthoritiesClaimName("roles");
        granted.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(granted);
        conv.setPrincipalClaimName("sub");          // Authentication.getName() trả về user UUID
        return conv;
    }

    private static SecretKey hmacKey(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "petclinic.auth.jwt.secret must be >= 32 bytes (256 bits) for HS256. Got " + bytes.length + " bytes."
            );
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}

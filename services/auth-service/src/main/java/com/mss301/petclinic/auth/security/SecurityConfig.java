package com.mss301.petclinic.auth.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.mss301.petclinic.common.security.endpoints.EndpointSecurityCustomizer;
import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;

/**
 * Auth-service security config.
 *
 * <p>JwtDecoder + JwtAuthenticationConverter từ common-security (JWKS-based). Auth-service GIỮ:</p>
 * <ul>
 *   <li>{@link JwtEncoder} — RSA signing (chỉ auth-service sign tokens)</li>
 *   <li>{@link PasswordEncoder} — BCrypt 12 rounds</li>
 *   <li>Custom {@link SecurityFilterChain} — permit public auth + JWKS endpoints</li>
 * </ul>
 *
 * <p>RBAC rules (register/login/refresh permit, /me + /logout authenticated, admin endpoints)
 * khai báo declarative ở {@code config-repo/auth-service.yml} và áp qua
 * {@link EndpointSecurityCustomizer}.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain authSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter,
            SecurityEndpointsProperties endpoints)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                                    "/actuator/health/**",
                                    "/actuator/info",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html")
                            .permitAll();
                    EndpointSecurityCustomizer.apply(auth, endpoints);
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }
}

package com.mss301.petclinic.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Gateway security — defense lớp NGOÀI cùng. Kill request với JWT hỏng SỚM,
 * không lãng phí lb/circuit-breaker resource cho downstream.
 *
 * <h4>Public paths qua gateway</h4>
 * <ul>
 *   <li>{@code /api/v1/auth/register}, {@code /api/v1/auth/login} — auth endpoints chưa có token</li>
 *   <li>{@code /fallback} — CircuitBreaker forward target (gateway nội bộ)</li>
 *   <li>{@code /actuator/health/**} — k8s probe</li>
 * </ul>
 *
 * <h4>Downstream services (customers/vets/...)</h4>
 * VẪN validate token độc lập (defense-in-depth). Xem common-security default chain.
 */
@Configuration
public class GatewaySecurityConfig {

    @Bean
    public SecurityFilterChain gatewaySecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public auth + JWKS endpoints
                        .requestMatchers(
                                "/api/v1/auth/register",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/.well-known/jwks.json"
                        ).permitAll()
                        .requestMatchers("/fallback").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

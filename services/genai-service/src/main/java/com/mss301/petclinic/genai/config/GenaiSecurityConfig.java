package com.mss301.petclinic.genai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Reactive security — WebFlux stack (Phase 12e SSE streaming).
 *
 * <p>JWT validation từ {@code common-security}: bean {@link JwtAuthenticationConverter} đã có
 * (sync). Adapt qua {@link ReactiveJwtAuthenticationConverterAdapter} cho WebFlux resource server.
 */
@Configuration
@EnableWebFluxSecurity
public class GenaiSecurityConfig {

    @Bean
    public SecurityWebFilterChain genaiSecurityFilterChain(
            ServerHttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(auth -> auth
                        .pathMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        // Admin LLM config — ROLE_ADMIN. JWT claim "roles"=ADMIN → JwtGrantedAuthoritiesConverter map ROLE_ADMIN.
                        .pathMatchers("/api/v1/admin/llm/**").hasRole("ADMIN")
                        .pathMatchers("/api/v1/ai/**").authenticated()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j ->
                        j.jwtAuthenticationConverter(new ReactiveJwtAuthenticationConverterAdapter(jwtAuthConverter))))
                .build();
    }
}

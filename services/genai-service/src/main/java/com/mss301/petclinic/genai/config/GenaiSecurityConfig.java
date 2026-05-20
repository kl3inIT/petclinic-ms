package com.mss301.petclinic.genai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;

import com.mss301.petclinic.common.security.endpoints.ReactiveEndpointSecurityCustomizer;
import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties;

/**
 * Reactive security — WebFlux stack (Phase 12e SSE streaming).
 *
 * <p>JWT validation từ {@code common-security}: bean {@link JwtAuthenticationConverter} đã có
 * (sync). Adapt qua {@link ReactiveJwtAuthenticationConverterAdapter} cho WebFlux resource server.
 *
 * <p>RBAC rules (USER /api/v1/ai/**, ADMIN /api/v1/admin/llm/**) khai báo declarative ở
 * {@code config-repo/genai-service.yml} dưới {@code petclinic.security.endpoints.*} và áp qua
 * {@link ReactiveEndpointSecurityCustomizer}.
 */
@Configuration
@EnableWebFluxSecurity
public class GenaiSecurityConfig {

    @Bean
    public SecurityWebFilterChain genaiSecurityFilterChain(
            ServerHttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter,
            SecurityEndpointsProperties endpoints) {
        return http.csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(auth -> {
                    auth.pathMatchers(
                                    "/actuator/health/**",
                                    "/actuator/info",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html")
                            .permitAll();
                    ReactiveEndpointSecurityCustomizer.apply(auth, endpoints);
                    auth.anyExchange().authenticated();
                })
                .oauth2ResourceServer(o -> o.jwt(j ->
                        j.jwtAuthenticationConverter(new ReactiveJwtAuthenticationConverterAdapter(jwtAuthConverter))))
                .build();
    }
}

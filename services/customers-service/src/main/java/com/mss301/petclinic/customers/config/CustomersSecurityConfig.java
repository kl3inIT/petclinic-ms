package com.mss301.petclinic.customers.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.mss301.petclinic.common.security.endpoints.EndpointSecurityCustomizer;
import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties;

/**
 * Customers-service security — declarative RBAC từ {@code config-repo/customers-service.yml}.
 *
 * <p>Customers chứa PII (full name, email, address, phone) → role gating chặt hơn vets:
 * USER chỉ GET pet, STAFF list/create owner, ADMIN delete + manage pet catalog.
 *
 * <p>Per-instance ownership đã enforce qua {@code @PreAuthorize} ở
 * {@code OwnerController.getOwner(id)} dùng helper {@code @ownerSecurity.isOwner}.
 * {@code @EnableMethodSecurity} bật annotation-based authorization.
 */
@Configuration
@EnableMethodSecurity
public class CustomersSecurityConfig {

    @Bean
    public SecurityFilterChain customersSecurityFilterChain(
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
}

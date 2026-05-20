package com.mss301.petclinic.customers.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
 * <p>Per-instance ownership (vd "USER chỉ xem owner record của mình") chưa enforce
 * tại tầng này — cần {@code @PreAuthorize("@ownerSecurity.isOwner(#id, authentication)")}
 * ở controller. Hiện tại UI chỉ admin/staff dùng → coarse role-based đủ.
 */
@Configuration
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

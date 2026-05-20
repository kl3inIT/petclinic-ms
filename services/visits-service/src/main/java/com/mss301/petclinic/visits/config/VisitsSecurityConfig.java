package com.mss301.petclinic.visits.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Visits-service security — override default chain ở common-security để khai báo
 * role-based access cho từng endpoint TẠI MỘT NƠI (single source of truth).
 *
 * <h4>Ownership</h4>
 * Resource-level check (vd "USER chỉ cancel được visit của mình") KHÔNG ở đây —
 * đặt trong {@code VisitServiceImpl.cancel(...)} để check sau khi load entity,
 * tránh hit DB 2 lần và dễ test domain logic riêng.
 *
 * <h4>Bean ưu tiên</h4>
 * Service tự khai báo bean này → common-security {@code @ConditionalOnMissingBean} tự lùi.
 */
@Configuration
public class VisitsSecurityConfig {

    @Bean
    public SecurityFilterChain visitsSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public — infra endpoints
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // Internal callback từ workflow-service — dùng X-Workflow-Token, không JWT.
                        .requestMatchers("/internal/**").permitAll()

                        // Write — role-restricted
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/visits/*/complete")
                            .hasAnyRole("VET", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/visits/*/start")
                            .hasAnyRole("VET", "STAFF", "ADMIN")

                        // Read + book + cancel — bất kỳ user đã đăng nhập.
                        // Ownership check (USER vs STAFF/ADMIN) làm ở service layer.
                        .requestMatchers("/api/v1/visits/**").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

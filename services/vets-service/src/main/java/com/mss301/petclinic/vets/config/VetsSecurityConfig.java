package com.mss301.petclinic.vets.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Vets-service security — override default chain ở common-security để khai báo
 * role-based access cho từng endpoint TẠI MỘT NƠI (single source of truth).
 *
 * <h4>Ma trận quyền</h4>
 * <ul>
 *   <li>{@code GET /api/v1/vets/**}, {@code GET /api/v1/specialties/**} — authenticated (mọi USER xem được)</li>
 *   <li>{@code POST /api/v1/vets} — STAFF | ADMIN (tạo vet mới)</li>
 *   <li>{@code PATCH /api/v1/vets/**} — STAFF | ADMIN (sửa name + specialties)</li>
 *   <li>{@code DELETE /api/v1/vets/**} — ADMIN (hard delete)</li>
 * </ul>
 *
 * <h4>Bean ưu tiên</h4>
 * Service tự khai báo bean này → common-security {@code @ConditionalOnMissingBean} tự lùi.
 */
@Configuration
public class VetsSecurityConfig {

    @Bean
    public SecurityFilterChain vetsSecurityFilterChain(
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

                        // Write — role-restricted (thứ tự matter: cụ thể trước, broad sau)
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/**")
                            .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/vets")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/vets/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        // POST /api/v1/specialties tương lai (admin-only) — đã defer trong roadmap
                        .requestMatchers(HttpMethod.POST, "/api/v1/specialties/**")
                            .hasRole("ADMIN")

                        // Read — bất kỳ user đã đăng nhập
                        .requestMatchers("/api/v1/vets/**", "/api/v1/specialties/**").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

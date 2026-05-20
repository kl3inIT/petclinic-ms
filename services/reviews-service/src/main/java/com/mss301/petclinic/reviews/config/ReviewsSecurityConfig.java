package com.mss301.petclinic.reviews.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Reviews-service security — override default chain ở common-security để khai báo
 * role-based access cho từng endpoint TẠI MỘT NƠI (single source of truth).
 *
 * <h4>Public read</h4>
 * GET trên {@code /api/v1/reviews/**} (trừ {@code /me}) permitAll — khách xem được
 * review không cần login. Service tự filter status=PUBLISHED ở controller default.
 *
 * <h4>Ownership</h4>
 * Edit/Delete trên review của user khác → 404 (path-tamper protection) ở Service
 * layer thay vì 403, để tránh leak existence. Filter chain chỉ enforce authenticated.
 *
 * <h4>Bean ưu tiên</h4>
 * Service tự khai báo bean này → common-security {@code @ConditionalOnMissingBean} tự lùi.
 */
@Configuration
public class ReviewsSecurityConfig {

    @Bean
    public SecurityFilterChain reviewsSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Infra endpoints
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // Admin moderation queue — STAFF/ADMIN.
                        // DELETE /admin/reviews/* + PATCH unhide chỉ ADMIN.
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/reviews/**")
                            .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/reviews/*/unhide")
                            .hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/reviews/**")
                            .hasAnyRole("STAFF", "ADMIN")

                        // USER endpoints — phải đăng nhập.
                        .requestMatchers("/api/v1/reviews/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/reviews").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/reviews/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/reviews/*").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/reviews/*/vote").authenticated()

                        // Public read — khách xem review không cần login.
                        // ĐẶT SAU các rule cụ thể để Spring Security match đúng thứ tự.
                        .requestMatchers(HttpMethod.GET, "/api/v1/reviews/**").permitAll()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

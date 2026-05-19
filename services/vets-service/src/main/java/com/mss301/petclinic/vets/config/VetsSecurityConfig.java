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
 *   <li><strong>Default non-GET</strong> trên {@code /vets/**} → STAFF|ADMIN; trên {@code /specialties/**} → ADMIN.
 *       Endpoint mới (vd. PUT tương lai) mặc định an toàn — KHÔNG để USER access nếu dev quên.</li>
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

                        // Write — explicit rules trước (thứ tự matter: cụ thể trước, broad sau)
                        // Sub-resource (education, work-schedule, ...): STAFF được delete vì
                        // lifecycle riêng, không gây mất audit nghiêm trọng như hard-delete cả vet
                        // record. Pattern phải khai báo TRƯỚC rule DELETE /vets/** → ADMIN bên dưới.
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/educations/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/work-schedule/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/ratings/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/badges/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/vets/**")
                            .hasRole("ADMIN")

                        // Read — chỉ GET (KHÔNG dùng catch-all .authenticated() để tránh
                        // bypass khi dev thêm PUT/POST/PATCH mới mà quên rule cụ thể)
                        .requestMatchers(HttpMethod.GET, "/api/v1/vets/**", "/api/v1/specialties/**")
                            .authenticated()

                        // Default guard cho mọi non-GET còn lại — secure by default:
                        //   vets/**       → STAFF|ADMIN (covers POST, PATCH, future PUT)
                        //   specialties/** → ADMIN (catalog management)
                        .requestMatchers("/api/v1/vets/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers("/api/v1/specialties/**")
                            .hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

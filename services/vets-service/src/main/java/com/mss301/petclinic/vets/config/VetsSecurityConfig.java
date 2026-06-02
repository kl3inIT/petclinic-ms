package com.mss301.petclinic.vets.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.mss301.petclinic.common.security.endpoints.EndpointSecurityCustomizer;
import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties;

/**
 * Vets-service security — declarative RBAC từ {@code config-repo/vets-service.yml} qua
 * {@link EndpointSecurityCustomizer}, PLUS 2 nhóm rule hardcoded không fit YAML pattern.
 *
 * <h4>Hardcoded rules — lý do</h4>
 * <ol>
 *   <li><b>Phase K /me endpoints</b> — cần VET+STAFF+ADMIN (3 role). Helper
 *       {@code customRoles} chỉ support single role + ADMIN; staffEndpoints chỉ STAFF+ADMIN.
 *       Hardcode 2 dòng đơn giản hơn extend helper.</li>
 *   <li><b>Sub-resource DELETE</b> ({@code /vets/{id}/educations/**}, work-schedule, ratings,
 *       badges, photo, album) — STAFF có quyền. Helper apply admin bucket TRƯỚC staff →
 *       pattern broad {@code DELETE /vets/**} (admin-only) sẽ match sub-resource trước,
 *       STAFF bị block. Hardcode sub-resource DELETE TRƯỚC apply() để specificity win.</li>
 * </ol>
 *
 * <h4>Filter chain order</h4>
 * <ol>
 *   <li>Infra endpoints permitAll (actuator, swagger)</li>
 *   <li>Phase K /me hardcoded — VET+STAFF+ADMIN</li>
 *   <li>Sub-resource DELETE hardcoded — STAFF+ADMIN</li>
 *   <li>{@link EndpointSecurityCustomizer#apply} áp public/admin/staff/user từ YAML</li>
 *   <li>{@code anyRequest().authenticated()} — safety net</li>
 * </ol>
 */
@Configuration
public class VetsSecurityConfig {

    @Bean
    public SecurityFilterChain vetsSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter,
            SecurityEndpointsProperties endpoints)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    // Infra — public
                    auth.requestMatchers(
                                    "/actuator/health/**",
                                    "/actuator/info",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html")
                            .permitAll();

                    // Phase K — /me endpoints (multi-role VET+STAFF+ADMIN, hardcoded vì
                    // customRoles helper chỉ support role+ADMIN). Phải khai báo TRƯỚC YAML
                    // rule /vets/** để first-match-wins.
                    auth.requestMatchers(HttpMethod.GET, "/api/v1/vets/me", "/api/v1/vets/me/**")
                            .hasAnyRole("VET", "STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.PATCH, "/api/v1/vets/me")
                            .hasAnyRole("VET", "STAFF", "ADMIN");

                    // Phase: vet tự quản lý avatar của mình qua /me/photo (vetId từ JWT, không
                    // path param). PUT/DELETE phải khai báo TRƯỚC YAML staff rule (PUT /vets/**)
                    // VÀ trước sub-resource DELETE /vets/*/photo (pattern `*` nuốt cả `me`) để
                    // first-match-wins, nếu không VET sẽ bị block (rule kia chỉ STAFF/ADMIN).
                    // GET /me/photo đã được rule GET /me/** ở trên cover.
                    auth.requestMatchers(HttpMethod.PUT, "/api/v1/vets/me/photo")
                            .hasAnyRole("VET", "STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/me/photo")
                            .hasAnyRole("VET", "STAFF", "ADMIN");

                    // Sub-resource DELETE — STAFF (lifecycle riêng, không hard-delete vet record).
                    // Hardcoded TRƯỚC apply() để win first-match vs YAML admin rule
                    // DELETE /api/v1/vets/** (admin-only).
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/educations/**")
                            .hasAnyRole("STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/work-schedule/**")
                            .hasAnyRole("STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/ratings/**")
                            .hasAnyRole("STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/badges/**")
                            .hasAnyRole("STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/photo")
                            .hasAnyRole("STAFF", "ADMIN");
                    auth.requestMatchers(HttpMethod.DELETE, "/api/v1/vets/*/album/**")
                            .hasAnyRole("STAFF", "ADMIN");

                    // General role rules từ YAML
                    EndpointSecurityCustomizer.apply(auth, endpoints);

                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

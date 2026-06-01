package com.mss301.petclinic.billing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Billing-service security — override default chain ở common-security để khai báo
 * role-based access tại MỘT NƠI.
 *
 * <h4>Danh mục bệnh</h4>
 * GET mở cho mọi user đã đăng nhập (vet/quầy tra cứu); CRUD chỉ ADMIN.
 *
 * <h4>Hoá đơn</h4>
 * <ul>
 *   <li>List + mở tab + checkout + huỷ + xoá dòng → STAFF/ADMIN (vai trò quầy thu ngân)</li>
 *   <li>Thêm dòng → STAFF/ADMIN/VET (vet thêm điều trị theo bệnh)</li>
 *   <li>{@code /me} → khách xem hoá đơn của mình; chi tiết {@code /{id}} kiểm ownership ở controller</li>
 * </ul>
 */
@Configuration
public class BillingSecurityConfig {

    @Bean
    public SecurityFilterChain billingSecurityFilterChain(
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

                        // ── Danh mục bệnh ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/diseases").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/diseases/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/diseases/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/diseases/**").authenticated()

                        // ── Hoá đơn: ghi ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/invoices/*/items")
                            .hasAnyRole("STAFF", "ADMIN", "VET")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/invoices/*/items/**")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/invoices/*/checkout")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/invoices/*/cancel")
                            .hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/invoices")
                            .hasAnyRole("STAFF", "ADMIN")

                        // ── Hoá đơn: đọc ──
                        .requestMatchers(HttpMethod.GET, "/api/v1/invoices/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/invoices")
                            .hasAnyRole("STAFF", "ADMIN", "VET")
                        .requestMatchers(HttpMethod.GET, "/api/v1/invoices/*").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

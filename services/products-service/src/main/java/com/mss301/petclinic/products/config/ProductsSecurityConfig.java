package com.mss301.petclinic.products.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Products-service security — override default chain ở common-security để khai báo
 * role-based access tại MỘT NƠI.
 *
 * <ul>
 *   <li>GET (tra cứu catalog) → mọi user đã đăng nhập (vet/quầy chọn khi kê đơn/lập hoá đơn).</li>
 *   <li>{@code POST /{id}/consume} (trừ kho khi kê đơn) → STAFF/ADMIN/VET. visits-service
 *       forward JWT của vet khi gọi.</li>
 *   <li>CRUD + {@code /restock} (quản trị catalog + nhập kho) → ADMIN.</li>
 * </ul>
 */
@Configuration
public class ProductsSecurityConfig {

    @Bean
    public SecurityFilterChain productsSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthConverter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // ── Trừ kho (cấp phát) — vet kê đơn cũng được ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/*/consume")
                            .hasAnyRole("STAFF", "ADMIN", "VET")

                        // ── Quản trị catalog + nhập kho — chỉ ADMIN ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/*/restock").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/products").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasRole("ADMIN")

                        // ── Đọc catalog — mọi user đã đăng nhập ──
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

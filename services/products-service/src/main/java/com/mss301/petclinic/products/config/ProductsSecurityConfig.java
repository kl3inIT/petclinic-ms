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
 *   <li>GET catalog → public để storefront đọc danh mục; lịch sử tồn kho vẫn bị giới hạn role.</li>
 *   <li>{@code POST /{id}/consume} (trừ kho khi kê đơn) → STAFF/ADMIN/VET. visits-service
 *       forward JWT của vet khi gọi.</li>
 *   <li>CRUD + {@code /restock} (quản trị catalog + nhập kho) → ADMIN/INVENTORY_MANAGER.</li>
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

                        // ── Nghiệp vụ kho thủ công — ADMIN hoặc INVENTORY_MANAGER ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/stock/documents")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/stock/movements")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")

                        // ── Trừ kho (cấp phát) — vet kê đơn cũng được ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/*/consume")
                            .hasAnyRole("STAFF", "ADMIN", "VET")
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/stock/consume")
                            .hasAnyRole("STAFF", "ADMIN", "VET")

                        // ── Quản trị catalog + nhập kho — ADMIN hoặc INVENTORY_MANAGER ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/*/restock")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers(HttpMethod.POST, "/api/v1/products")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/stock/*/movements")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/products/**")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**")
                            .hasAnyRole("ADMIN", "INVENTORY_MANAGER")

                        // ── Đọc catalog — mọi user đã đăng nhập ──
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

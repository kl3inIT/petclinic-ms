package com.mss301.petclinic.common.security.endpoints;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;

import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties.Endpoint;

/**
 * Áp rules từ {@link SecurityEndpointsProperties} vào {@link AuthorizeHttpRequestsConfigurer}.
 *
 * <h4>Thứ tự apply (matter!)</h4>
 * Spring Security match request theo thứ tự khai báo, dừng ở match đầu tiên. Helper áp:
 * <ol>
 *   <li><b>public</b> — không cần auth</li>
 *   <li><b>admin</b> — most restrictive role first (avoid leakage qua broader rule)</li>
 *   <li><b>staff</b></li>
 *   <li><b>user</b> — least restrictive role last</li>
 * </ol>
 *
 * <p>KHÔNG add catch-all {@code .anyRequest().authenticated()} — caller tự thêm sau khi
 * call helper. Lý do: caller có thể muốn các infra endpoint (actuator, swagger) permitAll
 * declare trực tiếp trước/sau, không buộc vào file YAML.
 *
 * <h4>Per-instance authorization</h4>
 * Helper chỉ cover role-based URL rules. Per-instance ("owner xem visit của mình") cần
 * {@code @PreAuthorize("@visitSecurity.canView(#id, authentication)")} ở controller —
 * URL pattern không biểu đạt được logic dựa trên path variable + entity ownership.
 */
public final class EndpointSecurityCustomizer {

    private EndpointSecurityCustomizer() {}

    /**
     * Áp tất cả endpoint rules vào registry. Caller dùng trong
     * {@code http.authorizeHttpRequests(auth -> { ... })} block.
     */
    public static void apply(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry,
            SecurityEndpointsProperties props) {
        // 1. Public — permitAll (đặt trước để skip role check cho path public)
        for (Endpoint e : props.publicEndpoints()) {
            applyPermitAll(registry, e);
        }
        // 2. Admin — role narrowest first
        for (Endpoint e : props.adminEndpoints()) {
            applyRole(registry, e, "ADMIN");
        }
        // 3. Custom roles (vd VET) — áp giữa admin và staff. Mỗi role được pair với ADMIN
        //    (admin override mọi quyền — convention). Cần custom hierarchy → service tự
        //    declare RoleHierarchy bean thay vì ép logic vào helper này.
        props.customRoles().forEach((role, endpoints) -> {
            for (Endpoint e : endpoints) {
                applyAnyRole(registry, e, role.toUpperCase(), "ADMIN");
            }
        });
        // 4. Staff
        for (Endpoint e : props.staffEndpoints()) {
            applyAnyRole(registry, e, "STAFF", "ADMIN");
        }
        // 5. User
        for (Endpoint e : props.userEndpoints()) {
            applyAnyRole(registry, e, "USER", "STAFF", "ADMIN");
        }
    }

    private static void applyPermitAll(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry,
            Endpoint e) {
        if (e.method() == null) {
            registry.requestMatchers(e.path()).permitAll();
        } else {
            registry.requestMatchers(e.method(), e.path()).permitAll();
        }
    }

    private static void applyRole(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry,
            Endpoint e,
            String role) {
        if (e.method() == null) {
            registry.requestMatchers(e.path()).hasRole(role);
        } else {
            registry.requestMatchers(e.method(), e.path()).hasRole(role);
        }
    }

    private static void applyAnyRole(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry,
            Endpoint e,
            String... roles) {
        if (e.method() == null) {
            registry.requestMatchers(e.path()).hasAnyRole(roles);
        } else {
            registry.requestMatchers(e.method(), e.path()).hasAnyRole(roles);
        }
    }
}

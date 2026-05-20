package com.mss301.petclinic.common.security.endpoints;

import org.springframework.security.config.web.server.ServerHttpSecurity.AuthorizeExchangeSpec;

import com.mss301.petclinic.common.security.endpoints.SecurityEndpointsProperties.Endpoint;

/**
 * Reactive variant của {@link EndpointSecurityCustomizer} — WebFlux stack.
 *
 * <p>Genai-service (Phase 12e SSE streaming) dùng {@link AuthorizeExchangeSpec} thay vì
 * {@code AuthorizeHttpRequestsConfigurer} của servlet. Cùng YAML schema
 * ({@link SecurityEndpointsProperties}), khác builder API → cần wrapper riêng.
 *
 * <h4>Usage</h4>
 * <pre>{@code
 * http.authorizeExchange(auth -> {
 *     auth.pathMatchers("/actuator/health/**").permitAll();
 *     ReactiveEndpointSecurityCustomizer.apply(auth, endpoints);
 *     auth.anyExchange().authenticated();
 * })
 * }</pre>
 */
public final class ReactiveEndpointSecurityCustomizer {

    private ReactiveEndpointSecurityCustomizer() {}

    public static void apply(AuthorizeExchangeSpec spec, SecurityEndpointsProperties props) {
        for (Endpoint e : props.publicEndpoints()) {
            applyPermitAll(spec, e);
        }
        for (Endpoint e : props.adminEndpoints()) {
            applyRole(spec, e, "ADMIN");
        }
        props.customRoles().forEach((role, endpoints) -> {
            for (Endpoint e : endpoints) {
                applyAnyRole(spec, e, role.toUpperCase(), "ADMIN");
            }
        });
        for (Endpoint e : props.staffEndpoints()) {
            applyAnyRole(spec, e, "STAFF", "ADMIN");
        }
        for (Endpoint e : props.userEndpoints()) {
            applyAnyRole(spec, e, "USER", "STAFF", "ADMIN");
        }
    }

    private static void applyPermitAll(AuthorizeExchangeSpec spec, Endpoint e) {
        if (e.method() == null) {
            spec.pathMatchers(e.path()).permitAll();
        } else {
            spec.pathMatchers(e.method(), e.path()).permitAll();
        }
    }

    private static void applyRole(AuthorizeExchangeSpec spec, Endpoint e, String role) {
        if (e.method() == null) {
            spec.pathMatchers(e.path()).hasRole(role);
        } else {
            spec.pathMatchers(e.method(), e.path()).hasRole(role);
        }
    }

    private static void applyAnyRole(AuthorizeExchangeSpec spec, Endpoint e, String... roles) {
        if (e.method() == null) {
            spec.pathMatchers(e.path()).hasAnyRole(roles);
        } else {
            spec.pathMatchers(e.method(), e.path()).hasAnyRole(roles);
        }
    }
}

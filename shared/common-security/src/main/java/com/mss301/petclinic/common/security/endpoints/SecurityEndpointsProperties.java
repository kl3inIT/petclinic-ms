package com.mss301.petclinic.common.security.endpoints;

import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.http.HttpMethod;

/**
 * Declarative role-based endpoint authorization — Least Privilege pattern.
 *
 * <p>Mỗi service khai báo endpoints của nó trong {@code config-repo/<service>.yml} dưới
 * prefix {@code petclinic.security.endpoints.*}. {@code EndpointSecurityCustomizer} đọc
 * record này và apply rules vào {@code SecurityFilterChain}.
 *
 * <h4>YAML schema</h4>
 * <pre>{@code
 * petclinic:
 *   security:
 *     endpoints:
 *       public:
 *         - { method: GET, path: /api/v1/vets/** }
 *       admin:
 *         - { method: DELETE, path: /api/v1/vets/** }
 *       staff:
 *         - { method: POST, path: /api/v1/vets }
 *         - { method: PATCH, path: /api/v1/vets/** }
 *       user:
 *         - { method: GET, path: /api/v1/visits }
 * }</pre>
 *
 * <h4>Design choices</h4>
 * <ul>
 *   <li><b>Specificity matters:</b> rules apply theo thứ tự declare. Đặt rule cụ thể trước
 *       rule rộng (vd DELETE /vets/** trước POST /vets/**).</li>
 *   <li><b>Tách 4 buckets thay vì 1 map:</b> đọc YAML dễ nhìn, "ai access cái gì" 1 lượt.</li>
 *   <li><b>HttpMethod nullable:</b> nếu YAML không khai báo method → match mọi method
 *       (giống {@code .requestMatchers(path)} không có HttpMethod arg).</li>
 *   <li><b>Per-instance authorization</b> KHÔNG cover ở đây — dùng {@code @PreAuthorize}
 *       method-level với SpEL bean (vd {@code @visitSecurity.canView(#id, authentication)}).</li>
 * </ul>
 *
 * <h4>Role mapping</h4>
 * JWT claim {@code roles: [USER, STAFF, ADMIN]} được {@code JwtGrantedAuthoritiesConverter}
 * map thành authority {@code ROLE_USER}, {@code ROLE_STAFF}, {@code ROLE_ADMIN}. Helper áp
 * {@code hasRole(...)} (Spring tự thêm {@code ROLE_} prefix).
 */
/**
 * Top-level: 4 well-known role buckets + {@code customRoles} map cho domain-specific
 * roles (vd VET). {@code customRoles}: key = role name uppercase (không ROLE_ prefix),
 * value = endpoints áp; áp giữa admin và staff bucket trong customizer.
 */
@ConfigurationProperties(prefix = "petclinic.security.endpoints")
public record SecurityEndpointsProperties(
        @DefaultValue List<Endpoint> publicEndpoints,
        @DefaultValue List<Endpoint> userEndpoints,
        @DefaultValue List<Endpoint> staffEndpoints,
        @DefaultValue List<Endpoint> adminEndpoints,
        @DefaultValue Map<String, List<Endpoint>> customRoles) {

    /**
     * 1 dòng rule. {@code method = null} → match mọi method với {@code path}.
     *
     * <p>YAML binding: {@code { method: POST, path: /api/v1/vets }}.
     * Spring Boot @ConfigurationProperties tự map từ flat YAML thành record.
     */
    public record Endpoint(HttpMethod method, String path) {}
}

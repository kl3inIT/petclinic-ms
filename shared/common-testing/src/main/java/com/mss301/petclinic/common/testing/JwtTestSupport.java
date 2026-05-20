package com.mss301.petclinic.common.testing;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Test helper cho JWT authentication. Tạo {@link Jwt} principal giả lập với roles tùy chọn —
 * sử dụng với {@code .with(jwt().authorities(...))} của Spring Security Test trong MockMvc/WebTestClient.
 *
 * <h4>Tại sao không dùng @WithMockUser?</h4>
 * Controller code đọc {@code @AuthenticationPrincipal Jwt jwt} + gọi {@code jwt.getSubject()} →
 * cần principal type {@link Jwt}, không phải {@code UsernamePasswordAuthenticationToken}.
 * @WithMockUser tạo loại sau → controller NullPointer khi getSubject().
 *
 * <h4>Usage MVC</h4>
 * <pre>{@code
 * mockMvc.perform(get("/api/v1/owners")
 *     .with(jwt().jwt(JwtTestSupport.userJwt()).authorities(JwtTestSupport.userAuthorities())))
 *     .andExpect(status().isOk());
 * }</pre>
 *
 * <h4>Usage WebFlux</h4>
 * <pre>{@code
 * webTestClient.mutateWith(SecurityMockServerConfigurers.mockJwt()
 *         .jwt(JwtTestSupport.userJwt())
 *         .authorities(JwtTestSupport.userAuthorities()))
 *     .get().uri("/api/v1/ai/chat").exchange()
 *     .expectStatus().isOk();
 * }</pre>
 */
public final class JwtTestSupport {

    /** UUID cố định cho user "test" — tái tạo deterministic trong test assertion. */
    public static final UUID TEST_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final UUID TEST_ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private JwtTestSupport() {}

    /** JWT principal cho user role ROLE_USER. */
    public static Jwt userJwt() {
        return jwtFor(TEST_USER_ID, "testuser", List.of("USER"));
    }

    /** JWT principal cho admin role ROLE_ADMIN + ROLE_USER. */
    public static Jwt adminJwt() {
        return jwtFor(TEST_ADMIN_ID, "testadmin", List.of("USER", "ADMIN"));
    }

    /** Custom JWT — dùng khi cần subject cụ thể (vd: ownership check). */
    public static Jwt jwtFor(UUID userId, String username, List<String> roles) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("test-token-" + userId)
                .header("alg", "RS256")
                .header("typ", "JWT")
                .subject(userId.toString())
                .claim("preferred_username", username)
                .claim("roles", roles)
                .issuer("petclinic-ms-test")
                .audience(List.of("petclinic-ms"))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .build();
    }

    /**
     * Authorities tương ứng JwtAuthenticationConverter (ROLE_ prefix).
     *
     * <p>Return type {@code Collection<GrantedAuthority>} (not {@code List<SimpleGrantedAuthority>})
     * để compatible với varargs/Collection overload của {@code JwtRequestPostProcessor.authorities(...)}.
     * List&lt;SimpleGrantedAuthority&gt; KHÔNG phải Collection&lt;GrantedAuthority&gt; do generic invariance.
     */
    public static Collection<GrantedAuthority> userAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    public static Collection<GrantedAuthority> adminAuthorities() {
        return List.of(
                new SimpleGrantedAuthority("ROLE_USER"),
                new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    /** Full JwtAuthenticationToken (vd: SecurityContextHolder.getContext().setAuthentication(...)). */
    public static JwtAuthenticationToken userAuthentication() {
        return new JwtAuthenticationToken(userJwt(), userAuthorities());
    }

    public static JwtAuthenticationToken adminAuthentication() {
        return new JwtAuthenticationToken(adminJwt(), adminAuthorities());
    }

    /**
     * Build {@link Map} claims đơn để inject vào Jwt builder thủ công khi cần customize.
     */
    public static Map<String, Object> defaultClaims(UUID userId, String username, List<String> roles) {
        Instant now = Instant.now();
        return Map.of(
                "sub", userId.toString(),
                "preferred_username", username,
                "roles", roles,
                "iss", "petclinic-ms-test",
                "aud", List.of("petclinic-ms"),
                "iat", now.getEpochSecond(),
                "exp", now.plusSeconds(3600).getEpochSecond());
    }
}

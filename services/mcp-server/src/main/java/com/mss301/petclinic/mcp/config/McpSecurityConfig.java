package com.mss301.petclinic.mcp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * MCP server security — OAuth 2.1 Resource Server theo MCP authorization spec 2025-11-25.
 *
 * <h4>Spec alignment (Spring IO 2026 slides)</h4>
 * <ul>
 *   <li>MCP server = <b>Resource Server</b>. Token unauthorized → 401 + {@code WWW-Authenticate}
 *       header (Spring Security tự generate).</li>
 *   <li>{@code /.well-known/oauth-protected-resource} expose metadata (servlet endpoint riêng,
 *       xem {@link WellKnownController}).</li>
 *   <li>JWT bearer auth via JWKS từ auth-service ({@code petclinic.auth.jwt.jwk-set-uri} ở
 *       common-security). Issuer + audience validate qua common-security validators.</li>
 *   <li>Public discovery: {@code /.well-known/**} permitAll. MCP transport endpoint
 *       {@code /mcp/**} authenticated.</li>
 * </ul>
 *
 * <h4>Bean ưu tiên</h4>
 * Override default {@code SecurityFilterChain} của common-security qua bean tự khai
 * ({@code @ConditionalOnMissingBean} ở common-security tự lùi).
 *
 * <h4>Tại sao KHÔNG dùng spring-ai-community/mcp-security?</h4>
 * Library 0.1.11 advertise "Spring AI 2.0.x branch" nhưng chưa verify với 2.0.0-M6 milestone
 * (churn breaking-change risk). Spring Security raw + manual metadata endpoint cho full
 * control + 0 dep mới. Pattern match với 4 service khác (auth/customers/vets/visits/genai)
 * dùng common-security cùng cách.
 */
@Configuration
public class McpSecurityConfig {

    @Bean
    public SecurityFilterChain mcpSecurityFilterChain(
            HttpSecurity http, JwtAuthenticationConverter jwtAuthConverter) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Infra public — actuator + swagger + MCP metadata discovery
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/.well-known/**")
                        .permitAll()
                        // MCP transport — protected. Client phải có JWT bearer (forward từ genai-service).
                        // Khi unauthorized: Spring Security trả 401 + WWW-Authenticate: Bearer
                        // → MCP client (Claude Desktop, Cursor) parse header để tìm auth server.
                        .requestMatchers("/mcp/**").authenticated()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthConverter)));
        return http.build();
    }
}

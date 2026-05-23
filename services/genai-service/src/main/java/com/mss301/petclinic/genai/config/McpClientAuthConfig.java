package com.mss301.petclinic.genai.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import io.modelcontextprotocol.client.transport.customizer.McpSyncHttpClientRequestCustomizer;
import reactor.core.publisher.Hooks;

/**
 * MCP client auth — forward JWT của user đang chat xuống mcp-server.
 *
 * <h4>Tại sao cần?</h4>
 * mcp-server siết security ({@code /mcp/**} authenticated, MCP spec 2025-11-25 = OAuth 2.1 RS).
 * Spring AI 2.0-M6 MCP client KHÔNG tự forward {@code Authorization} từ SecurityContext —
 * cần customizer thủ công.
 *
 * <h4>Sync HttpClient + WebFlux stack</h4>
 * Genai-service là WebFlux nhưng MCP client config {@code type: SYNC} → dùng JDK HttpClient
 * (blocking, same thread). Customizer hook gọi sync trên thread đang request → đọc được
 * {@link SecurityContextHolder}.
 *
 * <p>WebFlux Reactor Context → ThreadLocal bridging cần
 * {@link Hooks#enableAutomaticContextPropagation()} (Reactor 3.5+) — Boot 4 đã pull dep
 * {@code micrometer-context-propagation} qua starter, library tự register
 * {@code ReactorContextAccessor} cho {@code SecurityContextHolder}.
 *
 * <h4>Startup discovery vs runtime call</h4>
 * Lúc Spring AI MCP client init (boot) — KHÔNG có user context → customizer trả empty
 * header → request 401. Để tránh, set {@code spring.ai.mcp.client.initialized: false}
 * trong YAML → init delay đến lần đầu user chat (có SecurityContext valid).
 *
 * <h4>Best practice 2026 reference</h4>
 * <ul>
 *   <li>Spring AI MCP samples — {@code McpClientOAuth2Configurer} (mcp-client-security
 *       library). Petclinic chọn manual customizer thay vì lib để tránh extra dep + version
 *       compat risk với 2.0.0-M6 milestone.</li>
 *   <li>{@link McpSyncHttpClientRequestCustomizer} javadoc cảnh báo "Do not rely on
 *       thread-locals" cho async/reactive context — nhưng JDK HttpClient sync gọi blocking
 *       trên same thread của caller → ThreadLocal access OK.</li>
 * </ul>
 */
@Configuration
public class McpClientAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(McpClientAuthConfig.class);

    static {
        // Reactor + ThreadLocal bridging — propagate SecurityContext, Micrometer Observation
        // context khi switch giữa Reactor scheduler và blocking JDK HttpClient call.
        // Boot 4 micrometer-context-propagation tự register accessors cho SecurityContext.
        Hooks.enableAutomaticContextPropagation();
    }

    /**
     * Per-request customizer: lấy JWT từ {@link SecurityContextHolder}, thêm
     * {@code Authorization: Bearer ...} header. Skip nếu không có user context
     * (vd: startup discovery, scheduled task).
     */
    @Bean
    public McpSyncHttpClientRequestCustomizer mcpJwtForwarder() {
        return (builder, method, endpoint, body, context) -> {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth && jwtAuth.isAuthenticated()) {
                builder.header(
                        "Authorization", "Bearer " + jwtAuth.getToken().getTokenValue());
                log.debug("MCP request authorized: user={}, endpoint={}", auth.getName(), endpoint);
            } else {
                log.debug("MCP request without JWT (no user context): endpoint={}", endpoint);
            }
        };
    }
}

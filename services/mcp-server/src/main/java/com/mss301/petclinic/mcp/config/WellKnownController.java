package com.mss301.petclinic.mcp.config;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.security.jwt.PetClinicJwtProperties;

/**
 * OAuth 2.1 Protected Resource Metadata endpoint — MCP authorization spec 2025-11-25 (RFC 9728).
 *
 * <p>MCP client (Claude Desktop, Cursor, mcp-inspector...) khi nhận 401 + {@code WWW-Authenticate}
 * sẽ fetch endpoint này để biết:
 * <ul>
 *   <li>Authorization server nào issue token (để client redirect user qua OAuth flow)</li>
 *   <li>Documentation URI để hiểu resource server</li>
 *   <li>Supported auth methods + bearer methods</li>
 * </ul>
 *
 * <p>Endpoint path bắt buộc: {@code /.well-known/oauth-protected-resource}.
 * permitAll trong {@link McpSecurityConfig} — client gọi trước khi có token.
 *
 * <h4>Lý do viết thủ công thay vì dùng Spring Security tự sinh</h4>
 * Spring Security 7.x chưa có auto-config cho RFC 9728 Protected Resource Metadata. Library
 * {@code spring-ai-community/mcp-security} provide cái này nhưng petclinic tránh thêm dep
 * cho 1 endpoint đơn giản. Manual controller = 1 file, full control.
 *
 * <h4>Reference</h4>
 * <ul>
 *   <li>RFC 9728: <a href="https://datatracker.ietf.org/doc/html/rfc9728">OAuth Protected Resource Metadata</a></li>
 *   <li>MCP spec: <a href="https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization">Authorization §2.1</a></li>
 * </ul>
 */
@RestController
public class WellKnownController {

    private final String issuer;
    private final String resource;

    public WellKnownController(
            PetClinicJwtProperties jwt,
            @Value("${petclinic.mcp.resource-uri:http://localhost:8187/mcp}") String resourceUri) {
        // issuer claim của JWT — petclinic-ms default. Client dùng để verify token issued bởi đúng auth server.
        this.issuer = jwt.issuer();
        // Resource identifier — đúng URL MCP server expose (per RFC 8707 Resource Indicators).
        this.resource = resourceUri;
    }

    /**
     * Protected Resource Metadata (RFC 9728). Trả JSON khai báo authorization server + capabilities.
     *
     * <p>Trường tối thiểu MCP spec yêu cầu:
     * <ul>
     *   <li>{@code resource} — URI of this resource (RFC 8707)</li>
     *   <li>{@code authorization_servers[]} — list of trusted auth servers</li>
     *   <li>{@code bearer_methods_supported} — chỉ {@code header} (chuẩn cho REST + MCP)</li>
     * </ul>
     */
    @GetMapping(path = "/.well-known/oauth-protected-resource", produces = "application/json")
    public Map<String, Object> protectedResourceMetadata() {
        return Map.of(
                "resource", resource,
                // Petclinic auth-service vừa là issuer vừa là (mini) authorization server. Trong prod
                // dùng Keycloak/Auth0 ở đây.
                "authorization_servers", List.of(issuer),
                "bearer_methods_supported", List.of("header"),
                "scopes_supported", List.of("openid", "profile"),
                "resource_documentation",
                "https://github.com/kl3inIT/petclinic-ms/blob/main/docs/mcp.html");
    }
}

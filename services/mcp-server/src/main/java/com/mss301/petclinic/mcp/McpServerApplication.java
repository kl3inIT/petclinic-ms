package com.mss301.petclinic.mcp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * MCP (Model Context Protocol) server exposing petclinic domain as tools.
 *
 * <p>Spring AI 2.0.0-M6 + {@code spring-ai-starter-mcp-server-webmvc}. Protocol STREAMABLE
 * (HTTP, stateless) — modern variant kế thừa SSE. Cùng port chạy MCP transport + actuator.
 *
 * <p>Consumers:
 * <ul>
 *   <li>Internal: genai-service (Phase 12b) qua {@code spring-ai-starter-mcp-client} +
 *       Eureka LB → discover {@code mcp-server} → consume {@code ToolCallbackProvider}.</li>
 *   <li>External: Claude Desktop / Cursor / mcp-inspector qua HTTP endpoint
 *       {@code http://localhost:8187/mcp}.</li>
 * </ul>
 *
 * <p>KHÔNG có LLM ở đây — chỉ là tool catalog. Service hoàn toàn stateless, có thể scale ngang.
 */
@SpringBootApplication
@EnableDiscoveryClient
public class McpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }
}

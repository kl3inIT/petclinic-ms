package com.mss301.petclinic.mcp.tools;

import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Đăng ký bộ tool catalog cho MCP server.
 *
 * <p>{@code spring-ai-starter-mcp-server-webmvc} tự pick up {@link ToolCallbackProvider}
 * bean → expose qua MCP STREAMABLE endpoint. Không cần khai báo route handler riêng.
 *
 * <p>Trộn nhiều {@code @Service}/{@code @Component} chứa {@code @Tool} methods vào 1
 * provider — tool names không được trùng giữa các class.
 */
@Configuration
public class McpToolsConfig {

    @Bean
    public ToolCallbackProvider petclinicTools(
            CustomerTools customerTools,
            VetTools vetTools,
            VisitTools visitTools
    ) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(customerTools, vetTools, visitTools)
                .build();
    }
}

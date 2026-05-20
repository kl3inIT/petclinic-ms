package com.mss301.petclinic.genai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

import com.mss301.petclinic.genai.config.PetclinicAiProperties;

/**
 * petclinic-ms chatbot service. Spring AI 2.0.0-M6.
 *
 * <p>Architecture:
 * <ul>
 *   <li><b>LLM provider</b>: OpenRouter (OpenAI-compatible). Admin có thể đổi key/baseUrl/model
 *       qua {@code petclinic.ai.*} properties (Phase 12c sẽ thêm admin endpoint persist DB).</li>
 *   <li><b>Tools</b>: MCP client tự discover {@code mcp-server} qua Eureka + consume 8 tools
 *       (CustomerTools/VetTools/VisitTools) qua {@code SyncMcpToolCallbackProvider}.</li>
 *   <li><b>Memory</b>: {@code JdbcChatMemoryRepository} backed by Postgres schema {@code genai}.
 *       Per-user-conversation: conversationId = JWT sub UUID.</li>
 * </ul>
 *
 * <p>Endpoint: {@code POST /api/v1/ai/chat} (qua gateway: {@code /api/v1/ai/**}).
 * JWT-protected. Log mọi prompt + tool call + response (learning project).
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableConfigurationProperties(PetclinicAiProperties.class)
public class GenaiServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GenaiServiceApplication.class, args);
    }
}

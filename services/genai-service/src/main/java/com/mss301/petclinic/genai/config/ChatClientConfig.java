package com.mss301.petclinic.genai.config;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.client.okhttp.OpenAIOkHttpClientAsync;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.memory.repository.jdbc.PostgresChatMemoryRepositoryDialect;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Wire Spring AI core beans:
 * <ol>
 *   <li>{@link OpenAiChatModel} — manually built (NOT autoconfigured). Adapter mode:
 *       {@code baseUrl} override → bất kỳ OpenAI-compatible endpoint (OpenRouter, Together AI,
 *       LocalAI, vLLM, Ollama compat layer).</li>
 *   <li>{@link ChatMemoryRepository} — Postgres-backed qua {@code JdbcChatMemoryRepository}.</li>
 *   <li>{@link ChatMemory} — {@link MessageWindowChatMemory} sliding window.</li>
 *   <li>{@link ChatClient} — combined ChatModel + tool callbacks từ MCP server (auto inject
 *       {@link ToolCallbackProvider} từ {@code spring-ai-starter-mcp-client}).</li>
 * </ol>
 *
 * <p>⚠️ {@code spring.ai.model.*=none} bắt buộc trong config (gotcha #33) — không thì
 * starter auto-create OpenAiChatModel với api-key rỗng + boot-fail.
 *
 * <p>Pattern reference: zero-mail/backend/core/llm/gateway/springai/. KHÔNG copy code,
 * chỉ học cấu trúc (containment + properties-driven config).
 */
@Configuration
public class ChatClientConfig {

    /**
     * Build OpenAiChatModel với baseUrl override = OpenRouter (or any OpenAI-compatible).
     *
     * <p>⚠️ Spring AI 2.0.0-M6 breaking change vs 1.x: KHÔNG còn `OpenAiApi.builder()`
     * tự viết. Spring AI 2.0 chuyển sang dùng OFFICIAL OpenAI Java SDK
     * ({@code com.openai:openai-java}) — {@link OpenAIOkHttpClient} là transport layer.
     * Gotcha #34.
     */
    @Bean
    public OpenAIClient openAIClient(PetclinicAiProperties properties) {
        PetclinicAiProperties.Llm llm = properties.llm();
        return OpenAIOkHttpClient.builder()
                .baseUrl(llm.baseUrl())          // https://openrouter.ai/api/v1
                .apiKey(llm.apiKey())            // sk-or-v1-...
                .build();
    }

    /**
     * Async sibling — REQUIRED. {@link OpenAiChatModel} internally instantiate async client cho
     * streaming endpoint. Nếu KHÔNG cung cấp ở Builder, Spring AI gọi
     * {@code OpenAIOkHttpClientAsync.builder().build()} fallback → đọc apiKey từ env
     * {@code OPENAI_API_KEY} → throw "credential must be specified" khi env không có.
     */
    @Bean
    public OpenAIClientAsync openAIClientAsync(PetclinicAiProperties properties) {
        PetclinicAiProperties.Llm llm = properties.llm();
        return OpenAIOkHttpClientAsync.builder()
                .baseUrl(llm.baseUrl())
                .apiKey(llm.apiKey())
                .build();
    }

    @Bean
    public OpenAiChatModel openAiChatModel(OpenAIClient openAIClient,
                                            OpenAIClientAsync openAIClientAsync,
                                            PetclinicAiProperties properties) {
        return OpenAiChatModel.builder()
                .openAiClient(openAIClient)
                .openAiClientAsync(openAIClientAsync)
                .options(OpenAiChatOptions.builder()
                        .model(properties.llm().chatModel())     // anthropic/claude-3.5-haiku (OpenRouter)
                        .temperature(properties.chat().temperatureOrDefault())
                        .build())
                .build();
    }

    /** Postgres backed memory — bảng {@code ai_chat_memory} ở schema {@code genai}. */
    @Bean
    public ChatMemoryRepository chatMemoryRepository(JdbcTemplate jdbcTemplate) {
        return JdbcChatMemoryRepository.builder()
                .jdbcTemplate(jdbcTemplate)
                .dialect(new PostgresChatMemoryRepositoryDialect())
                .build();
    }

    /** Sliding window — giữ N message cuối cho mỗi conversationId. */
    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository chatMemoryRepository,
                                  PetclinicAiProperties properties) {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(properties.chat().memoryMaxMessagesOrDefault())
                .build();
    }

    /**
     * Composite ChatClient với:
     * - System prompt mặc định (mỗi request có thể override)
     * - Tool callbacks từ MCP server (auto-injected từ {@code spring-ai-starter-mcp-client}
     *   khi MCP client config khai báo server URL).
     *
     * <p>ChatMemoryAdvisor đăng ký per-request trong controller (conversationId từ JWT).
     */
    @Bean
    public ChatClient chatClient(OpenAiChatModel openAiChatModel,
                                  ToolCallbackProvider mcpToolProvider) {
        return ChatClient.builder(openAiChatModel)
                .defaultToolCallbacks(mcpToolProvider)
                .build();
    }
}

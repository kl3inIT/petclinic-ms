package com.mss301.petclinic.genai.config;

import com.mss301.petclinic.genai.admin.LlmConfig;
import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.client.okhttp.OpenAIOkHttpClientAsync;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Component;

/**
 * Volatile holder cho current {@link ChatClient}. Khi admin update LLM config qua
 * {@code POST /api/v1/admin/llm/config}, {@link com.mss301.petclinic.genai.admin.LlmConfigService}
 * gọi {@link #rebuild(LlmConfig)} → swap nguyên cả bộ (OpenAIClient sync/async + ChatModel
 * + ChatClient) atomic.
 *
 * <p>Không dùng Spring {@code @RefreshScope} vì nó chỉ refresh khi /actuator/refresh hit
 * và làm hỏng @Transactional proxy ở bean phụ thuộc.
 *
 * <p>MCP {@link ToolCallbackProvider} TÁCH BIỆT khỏi LLM config — inject 1 lần ở init,
 * reuse qua mọi rebuild. Tool callbacks không cần rebuild khi đổi LLM.
 */
@Component
public class LlmClientHolder {

    private static final Logger log = LoggerFactory.getLogger(LlmClientHolder.class);

    private final ToolCallbackProvider mcpToolProvider;
    private final PetclinicAiProperties bootstrapProperties;

    private volatile ChatClient currentChatClient;

    public LlmClientHolder(ToolCallbackProvider mcpToolProvider,
                            PetclinicAiProperties bootstrapProperties) {
        this.mcpToolProvider = mcpToolProvider;
        this.bootstrapProperties = bootstrapProperties;
        // Bootstrap từ env. {@link com.mss301.petclinic.genai.admin.LlmConfigService}
        // @PostConstruct sẽ override sau khi load DB row (nếu có).
        // Nếu apiKey rỗng (chưa set) → defer build, ChatController trả lỗi tới khi admin save.
        PetclinicAiProperties.Llm llm = bootstrapProperties.llm();
        if (llm.apiKey() == null || llm.apiKey().isBlank()) {
            log.warn("Bootstrap LLM apiKey is BLANK — ChatClient deferred until admin POST /api/v1/admin/llm/config");
        } else {
            rebuild(new LlmConfig(llm.baseUrl(), llm.apiKey(), llm.chatModel()));
        }
    }

    /**
     * Current ChatClient snapshot. {@code null} nếu chưa có config (env empty + DB empty).
     * Caller (ChatController) phải check null + trả 503 Service Unavailable.
     */
    public ChatClient chatClient() {
        return currentChatClient;
    }

    public boolean isReady() {
        return currentChatClient != null;
    }

    public synchronized void rebuild(LlmConfig cfg) {
        log.info("Rebuilding ChatClient — baseUrl={}, model={}", cfg.baseUrl(), cfg.chatModel());

        OpenAIClient sync = OpenAIOkHttpClient.builder()
                .baseUrl(cfg.baseUrl())
                .apiKey(cfg.apiKey())
                .build();

        OpenAIClientAsync async = OpenAIOkHttpClientAsync.builder()
                .baseUrl(cfg.baseUrl())
                .apiKey(cfg.apiKey())
                .build();

        OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .openAiClient(sync)
                .openAiClientAsync(async)
                .options(OpenAiChatOptions.builder()
                        .model(cfg.chatModel())
                        .temperature(bootstrapProperties.chat().temperatureOrDefault())
                        .build())
                .build();

        this.currentChatClient = ChatClient.builder(chatModel)
                .defaultToolCallbacks(mcpToolProvider)
                .build();
    }
}

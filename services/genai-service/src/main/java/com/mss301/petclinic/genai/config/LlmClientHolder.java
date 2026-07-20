package com.mss301.petclinic.genai.config;

import jakarta.annotation.PostConstruct;

import io.micrometer.observation.ObservationRegistry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.genai.admin.LlmConfig;
import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.client.okhttp.OpenAIOkHttpClientAsync;

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
    private final ToolCallingManager toolCallingManager;
    private final PetclinicAiProperties bootstrapProperties;
    private final VectorStore vectorStore;  // null nếu Phase 12d skip RAG (no embedding key)

    private volatile ChatClient currentChatClient;
    // Retained with the model snapshot so a rebuild remains atomic with the OpenAI model.
    private volatile OpenAIClient currentSyncClient;
    private volatile String currentChatModelName;

    public LlmClientHolder(ToolCallbackProvider mcpToolProvider,
                            PetclinicAiProperties bootstrapProperties,
                            ObjectProvider<VectorStore> vectorStoreProvider,
                            ToolCallingManager toolCallingManager) {
        this.mcpToolProvider = mcpToolProvider;
        this.toolCallingManager = toolCallingManager;
        this.bootstrapProperties = bootstrapProperties;
        this.vectorStore = vectorStoreProvider.getIfAvailable();
        if (this.vectorStore == null) {
            log.info("VectorStore bean absent — RAG disabled. Set petclinic.ai.embedding.api-key to enable.");
        } else {
            log.info("VectorStore bean present — RAG enabled, RetrievalAugmentationAdvisor wired into ChatClient.");
        }
    }

    @PostConstruct
    void bootstrapFromEnvironment() {
        // Bootstrap từ env. LlmConfigService @PostConstruct sẽ override sau khi load DB row (nếu có).
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

    /** Current OpenAI SDK client, available for provider-specific diagnostics. */
    public OpenAIClient syncClient() {
        return currentSyncClient;
    }

    public String chatModelName() {
        return currentChatModelName;
    }

    public VectorStore vectorStore() {
        return vectorStore;
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

        ChatClient.Builder builder = ChatClient.builder(chatModel, ObservationRegistry.NOOP, null, null,
                ToolCallingAdvisor.builder().toolCallingManager(toolCallingManager))
                .defaultTools(mcpToolProvider);

        if (vectorStore != null) {
            // RAG: similarity top-3 chunks → inject vào prompt context. Mỗi chat call
            // sẽ search VectorStore TRƯỚC khi gửi message lên LLM.
            builder.defaultAdvisors(
                    RetrievalAugmentationAdvisor.builder()
                            .documentRetriever(VectorStoreDocumentRetriever.builder()
                                    .vectorStore(vectorStore)
                                    .topK(3)
                                    .build())
                            .build());
        }

        this.currentChatClient = builder.build();
        this.currentSyncClient = sync;
        this.currentChatModelName = cfg.chatModel();
    }
}

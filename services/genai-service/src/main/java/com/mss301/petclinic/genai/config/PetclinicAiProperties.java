package com.mss301.petclinic.genai.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI provider config bind từ {@code petclinic.ai.*}. Phase 12b: env-driven (đọc từ
 * {@code .env.local} via Spring Boot config import). Phase 12c sẽ thêm admin endpoint
 * persist DB + AES-GCM encrypt {@link #apiKey} (zero-mail BYOK pattern).
 *
 * <p>OpenRouter là OpenAI-compatible: 1 SDK {@code spring-ai-openai} đa-provider qua
 * {@link #baseUrl} override + tên model như {@code anthropic/claude-3.5-haiku}.
 */
@ConfigurationProperties(prefix = "petclinic.ai")
public record PetclinicAiProperties(
        Llm llm,
        Chat chat,
        Embedding embedding
) {

    public PetclinicAiProperties {
        if (llm == null) llm = new Llm(null, null, null, null);
        if (chat == null) chat = new Chat(null, null);
        if (embedding == null) embedding = new Embedding(null, null, null, null);
    }

    /**
     * OpenAI-compatible endpoint config.
     *
     * @param baseUrl      endpoint root, vd: {@code https://openrouter.ai/api/v1}
     * @param apiKey       API key — {@code sk-or-v1-...} cho OpenRouter, {@code sk-...} cho OpenAI gốc
     * @param chatModel    Model ID — OpenRouter format {@code provider/model}, vd {@code anthropic/claude-3.5-haiku}
     * @param readTimeout  HTTP read timeout — default 60s cho chat (stream nhanh hơn)
     */
    public record Llm(
            String baseUrl,
            String apiKey,
            String chatModel,
            Duration readTimeout
    ) {
        public Duration readTimeoutOrDefault() {
            return readTimeout != null ? readTimeout : Duration.ofSeconds(60);
        }
    }

    /**
     * Chat behaviour.
     *
     * @param temperature       0.0-2.0 — thấp = nhất quán, cao = sáng tạo. Default 0.7.
     * @param memoryMaxMessages Số message giữ trong memory window. Default 10 (5 user + 5 assistant).
     */
    public record Chat(
            Double temperature,
            Integer memoryMaxMessages
    ) {
        public double temperatureOrDefault() {
            return temperature != null ? temperature : 0.7;
        }

        public int memoryMaxMessagesOrDefault() {
            return memoryMaxMessages != null ? memoryMaxMessages : 10;
        }
    }

    /**
     * Embedding config — Phase 12d RAG. KHÁC LLM provider vì OpenRouter
     * KHÔNG hỗ trợ {@code /embeddings} endpoint (chat-only). Phải:
     * <ul>
     *   <li>OpenAI direct ({@code https://api.openai.com/v1} + sk-... key), HOẶC</li>
     *   <li>Ollama local ({@code http://localhost:11434/v1} + bất kỳ key, không check)</li>
     * </ul>
     *
     * <p>Empty apiKey → RAG bean skip, ChatClient build không có {@code QuestionAnswerAdvisor}.
     * App vẫn chạy bình thường, chỉ thiếu domain knowledge augmentation.
     *
     * @param baseUrl     embedding API root, vd {@code https://api.openai.com/v1}
     * @param apiKey      provider key; trống = skip RAG
     * @param model       embedding model id, vd {@code text-embedding-3-small} (OpenAI)
     *                    hay {@code nomic-embed-text} (Ollama)
     * @param dimensions  vector dim. Default 1536 (OpenAI 3-small). Ollama nomic = 768.
     */
    public record Embedding(
            String baseUrl,
            String apiKey,
            String model,
            Integer dimensions
    ) {
        public boolean isConfigured() {
            return apiKey != null && !apiKey.isBlank();
        }

        public String baseUrlOrDefault() {
            return baseUrl != null && !baseUrl.isBlank() ? baseUrl : "https://api.openai.com/v1";
        }

        public String modelOrDefault() {
            return model != null && !model.isBlank() ? model : "text-embedding-3-small";
        }

        public int dimensionsOrDefault() {
            return dimensions != null ? dimensions : 1536;
        }
    }
}

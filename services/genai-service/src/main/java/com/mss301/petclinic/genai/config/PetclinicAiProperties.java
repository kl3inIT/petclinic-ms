package com.mss301.petclinic.genai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

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
        Chat chat
) {

    public PetclinicAiProperties {
        if (llm == null) llm = new Llm(null, null, null, null);
        if (chat == null) chat = new Chat(null, null);
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
}

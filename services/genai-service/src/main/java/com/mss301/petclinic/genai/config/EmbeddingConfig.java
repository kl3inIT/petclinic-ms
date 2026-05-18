package com.mss301.petclinic.genai.config;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.client.okhttp.OpenAIOkHttpClientAsync;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Embedding model — Phase 12d RAG.
 *
 * <p>Conditional: chỉ create bean khi {@code petclinic.ai.embedding.api-key} có giá trị.
 * Trống → ChatClient build không có {@link org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor},
 * chat vẫn chạy nhưng không có domain knowledge augmentation.
 *
 * <p>Bean tách biệt khỏi LLM chat model vì 2 lý do:
 * <ol>
 *   <li>Provider có thể khác — OpenRouter chỉ chat, embedding phải OpenAI direct hoặc Ollama.</li>
 *   <li>Lifecycle khác — embedding ít đổi, không cần admin runtime swap như Phase 12c.</li>
 * </ol>
 */
@Configuration
@ConditionalOnProperty(prefix = "petclinic.ai.embedding", name = "api-key")
public class EmbeddingConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingConfig.class);

    @Bean
    @Qualifier("embedding")
    public OpenAIClient embeddingOpenAIClient(PetclinicAiProperties properties) {
        PetclinicAiProperties.Embedding embed = properties.embedding();
        log.info("Embedding OpenAIClient bean — baseUrl={}, model={}",
                embed.baseUrlOrDefault(), embed.modelOrDefault());
        return OpenAIOkHttpClient.builder()
                .baseUrl(embed.baseUrlOrDefault())
                .apiKey(embed.apiKey())
                .build();
    }

    @Bean
    @Qualifier("embedding")
    public OpenAIClientAsync embeddingOpenAIClientAsync(PetclinicAiProperties properties) {
        PetclinicAiProperties.Embedding embed = properties.embedding();
        return OpenAIOkHttpClientAsync.builder()
                .baseUrl(embed.baseUrlOrDefault())
                .apiKey(embed.apiKey())
                .build();
    }

    /**
     * OpenAiEmbeddingModel 2.0 KHÔNG có {@code .builder()} (chỉ ChatModel có) —
     * dùng constructor positional. Async client transitively built bên trong từ sync
     * (verified qua jar inspection, không cần truyền explicit như ChatModel).
     */
    @Bean
    public EmbeddingModel openAiEmbeddingModel(
            @Qualifier("embedding") OpenAIClient sync,
            PetclinicAiProperties properties) {
        PetclinicAiProperties.Embedding embed = properties.embedding();
        return new OpenAiEmbeddingModel(
                sync,
                org.springframework.ai.document.MetadataMode.EMBED,
                OpenAiEmbeddingOptions.builder()
                        .model(embed.modelOrDefault())
                        .build());
    }
}

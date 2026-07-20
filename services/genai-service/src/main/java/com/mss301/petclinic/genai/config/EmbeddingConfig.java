package com.mss301.petclinic.genai.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.context.annotation.Primary;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

/**
 * Embedding model — Phase 12d RAG.
 *
 * <p>Conditional: chỉ create bean khi {@code petclinic.ai.embedding.api-key} có giá trị.
 * Trống → ChatClient build không có retrieval augmentation advisor,
 * chat vẫn chạy nhưng không có domain knowledge augmentation.
 *
 * <p>Bean tách biệt khỏi LLM chat model vì 2 lý do:
 * <ol>
 *   <li>Provider có thể khác — OpenRouter chỉ chat, embedding phải OpenAI direct hoặc Ollama.</li>
 *   <li>Lifecycle khác — embedding ít đổi, không cần admin runtime swap như Phase 12c.</li>
 * </ol>
 */
@Configuration
// @ConditionalOnProperty với name=api-key fire kể cả khi value="" (Spring Boot match-if-set).
// Cần ExpressionLanguage để loại trừ chuỗi rỗng — tránh tạo OpenAIClient với apiKey=null,
// PgVectorStore autoconfig nuốt rồi RAG advisor crash khi query embedding.
@ConditionalOnExpression("!'${petclinic.ai.embedding.api-key:}'.isEmpty() && !'${petclinic.ai.embedding.base-url:}'.contains('openrouter.ai')")
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

    /** Bean name "petclinicEmbeddingModel" tránh conflict với Spring AI autoconfig
     * (cùng name "openAiEmbeddingModel" — sẽ fail vì spring.main.allow-bean-definition-overriding=false). */
    @Bean
    @Primary
    public EmbeddingModel petclinicEmbeddingModel(
            @Qualifier("embedding") OpenAIClient sync,
            PetclinicAiProperties properties) {
        PetclinicAiProperties.Embedding embed = properties.embedding();
        return OpenAiEmbeddingModel.builder()
                .openAiClient(sync)
                .metadataMode(org.springframework.ai.document.MetadataMode.EMBED)
                .options(OpenAiEmbeddingOptions.builder()
                        .model(embed.modelOrDefault())
                        .build())
                .build();
    }

    /**
     * The Spring AI auto-configuration is intentionally excluded: it creates a PgVector store
     * even when this conditional embedding configuration is absent. Keeping both beans under the
     * same condition lets chat run without RAG when no valid embedding provider is configured.
     */
    @Bean
    public VectorStore petclinicVectorStore(JdbcTemplate jdbcTemplate,
                                             EmbeddingModel embeddingModel,
                                             PetclinicAiProperties properties) {
        PetclinicAiProperties.Embedding embed = properties.embedding();
        return PgVectorStore.builder(jdbcTemplate, embeddingModel)
                .schemaName("genai")
                .vectorTableName("vector_store")
                .dimensions(embed.dimensionsOrDefault())
                .distanceType(PgVectorStore.PgDistanceType.COSINE_DISTANCE)
                .indexType(PgVectorStore.PgIndexType.HNSW)
                .initializeSchema(false)
                .build();
    }
}

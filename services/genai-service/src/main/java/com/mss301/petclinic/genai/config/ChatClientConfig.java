package com.mss301.petclinic.genai.config;

import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.memory.repository.jdbc.PostgresChatMemoryRepositoryDialect;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Phase 12c restructure — bean OpenAIClient + OpenAiChatModel + ChatClient KHÔNG
 * còn ở đây vì admin có thể đổi LLM config runtime. Chúng được tạo + swap qua
 * {@link LlmClientHolder#rebuild(com.mss301.petclinic.genai.admin.LlmConfig)}.
 *
 * <p>Config class này giờ chỉ wire ChatMemory (không phụ thuộc LLM provider).
 */
@Configuration
public class ChatClientConfig {

    @Bean
    public ChatMemoryRepository chatMemoryRepository(JdbcTemplate jdbcTemplate) {
        return JdbcChatMemoryRepository.builder()
                .jdbcTemplate(jdbcTemplate)
                .dialect(new PostgresChatMemoryRepositoryDialect())
                .build();
    }

    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository chatMemoryRepository,
                                  PetclinicAiProperties properties) {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(properties.chat().memoryMaxMessagesOrDefault())
                .build();
    }
}

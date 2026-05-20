package com.mss301.petclinic.genai.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mss301.petclinic.genai.admin.dto.SaveLlmConfigRequest;
import com.mss301.petclinic.genai.config.LlmClientHolder;
import com.mss301.petclinic.genai.config.PetclinicAiProperties;

/**
 * Pure unit test cho admin LLM config service. KHÔNG đụng DB, KHÔNG đụng OpenAI API.
 *
 * <h4>Test scope</h4>
 * <ul>
 *   <li>Precedence: DB row > env bootstrap khi {@code getCurrent()}</li>
 *   <li>{@code save()} rebuild client + persist encrypted ciphertext</li>
 *   <li>API key masking trong response</li>
 * </ul>
 *
 * <p>Validate endpoint (ping OpenAI thật) KHÔNG test ở đây — đó là integration với network.
 * Mock OpenAIClient ở slice/integration test nếu cần coverage.
 */
@ExtendWith(MockitoExtension.class)
class LlmConfigServiceTest {

    @Mock LlmConfigRepository repository;
    @Mock AesGcmEncryptor encryptor;
    @Mock PetclinicAiProperties bootstrapProperties;
    @Mock LlmClientHolder clientHolder;

    @InjectMocks LlmConfigService service;

    @Test
    @DisplayName("getCurrent — DB row present → decrypt + return")
    void getCurrent_dbRow_returnsDecrypted() {
        LlmConfigEntity entity = new LlmConfigEntity(
                "https://openrouter.ai/api/v1", "encrypted-blob", "anthropic/claude-3.5-haiku", "admin");
        given(repository.findById(1L)).willReturn(Optional.of(entity));
        given(encryptor.decrypt("encrypted-blob")).willReturn("sk-or-decrypted-key");

        LlmConfig result = service.getCurrent();

        assertThat(result.baseUrl()).isEqualTo("https://openrouter.ai/api/v1");
        assertThat(result.apiKey()).isEqualTo("sk-or-decrypted-key");
        assertThat(result.chatModel()).isEqualTo("anthropic/claude-3.5-haiku");
    }

    @Test
    @DisplayName("getCurrent — DB empty → fallback từ env bootstrap")
    void getCurrent_dbEmpty_fallsBackToBootstrap() {
        given(repository.findById(1L)).willReturn(Optional.empty());
        given(bootstrapProperties.llm()).willReturn(new PetclinicAiProperties.Llm(
                "https://api.openai.com/v1", "sk-env-key", "gpt-4o-mini", null));

        LlmConfig result = service.getCurrent();

        assertThat(result.baseUrl()).isEqualTo("https://api.openai.com/v1");
        assertThat(result.apiKey()).isEqualTo("sk-env-key");
    }

    @Test
    @DisplayName("save → encrypt apiKey + persist + rebuild client")
    void save_persistsEncryptedAndRebuilds() {
        var request = new SaveLlmConfigRequest(
                "https://openrouter.ai/api/v1", "sk-or-new-key", "google/gemini-2.5-flash");
        given(encryptor.encrypt("sk-or-new-key")).willReturn("encrypted-new");
        given(repository.findById(1L)).willReturn(Optional.empty());
        given(repository.save(any(LlmConfigEntity.class))).willAnswer(inv -> {
            LlmConfigEntity e = inv.getArgument(0);
            // Simulate JPA assigning id + audit fields.
            return e;
        });
        // getCurrentMasked sau save → repository.findById gọi LẠI (fresh read).
        // Để return entity vừa save thay vì empty fallback, stub callback.
        var saved = new LlmConfigEntity("https://openrouter.ai/api/v1", "encrypted-new", "google/gemini-2.5-flash", "user-uuid");
        given(repository.findById(1L)).willReturn(Optional.empty(), Optional.of(saved));
        given(encryptor.decrypt("encrypted-new")).willReturn("sk-or-new-key");

        var result = service.save(request, "user-uuid");

        // Verify ciphertext persisted, plaintext apiKey KHÔNG xuất hiện trong save.
        then(repository).should().save(any(LlmConfigEntity.class));
        then(encryptor).should().encrypt("sk-or-new-key");
        // Client rebuild với plaintext apiKey + new model.
        then(clientHolder).should().rebuild(any(LlmConfig.class));
        // Response masked.
        assertThat(result.apiKeyMasked()).startsWith("sk-o").endsWith("-key");
        assertThat(result.apiKeyMasked()).contains("...");
    }

    @Test
    @DisplayName("mask — key ngắn (< 12) → ***")
    void mask_shortKey_returnsAsterisks() {
        assertThat(LlmConfigService.mask("short")).isEqualTo("***");
        assertThat(LlmConfigService.mask(null)).isEqualTo("***");
    }

    @Test
    @DisplayName("mask — key dài → 4 đầu...4 cuối")
    void mask_longKey_partialReveal() {
        assertThat(LlmConfigService.mask("sk-or-abcdefghijklmnop"))
                .isEqualTo("sk-o...mnop");
    }
}

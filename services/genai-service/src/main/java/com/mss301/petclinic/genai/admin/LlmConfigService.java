package com.mss301.petclinic.genai.admin;

import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.genai.admin.dto.LlmConfigResponse;
import com.mss301.petclinic.genai.admin.dto.SaveLlmConfigRequest;
import com.mss301.petclinic.genai.admin.dto.ValidateLlmConfigRequest;
import com.mss301.petclinic.genai.admin.dto.ValidateLlmConfigResponse;
import com.mss301.petclinic.genai.config.LlmClientHolder;
import com.mss301.petclinic.genai.config.PetclinicAiProperties;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

/**
 * Source of truth cho LLM config.
 *
 * <h4>Precedence</h4>
 * <ol>
 *   <li>DB row (id=1) — set qua {@link #save} từ admin endpoint</li>
 *   <li>Env / config-repo (PETCLINIC_LLM_*) — bootstrap khi DB rỗng</li>
 * </ol>
 *
 * <p>Mọi đường đi đọc config (boot wiring, ChatController call mỗi request) đều qua
 * {@link #getCurrent()} — KHÔNG @Value/@ConfigurationProperties trực tiếp.
 *
 * <p>Save / Validate KHÔNG log apiKey plaintext. Log chỉ giữ length + first/last 4 ký tự.
 */
@Service
public class LlmConfigService {

    private static final Logger log = LoggerFactory.getLogger(LlmConfigService.class);

    private final LlmConfigRepository repository;
    private final AesGcmEncryptor encryptor;
    private final PetclinicAiProperties bootstrapProperties;
    private final LlmClientHolder clientHolder;

    public LlmConfigService(LlmConfigRepository repository,
                             AesGcmEncryptor encryptor,
                             PetclinicAiProperties bootstrapProperties,
                             LlmClientHolder clientHolder) {
        this.repository = repository;
        this.encryptor = encryptor;
        this.bootstrapProperties = bootstrapProperties;
        this.clientHolder = clientHolder;
    }

    /**
     * Sau khi Spring wire xong: nếu DB có row → đè bootstrap (env) lên holder.
     * DB là source of truth khi đã có; env chỉ là fallback lần đầu.
     */
    @PostConstruct
    @Transactional(readOnly = true)
    void loadFromDbOnStartup() {
        repository.findById(1L).ifPresent(entity -> {
            log.info("DB has LLM config row (updatedAt={}) — overriding env bootstrap", entity.getUpdatedAt());
            clientHolder.rebuild(fromEntity(entity));
        });
    }

    /** DB row decrypted, fallback env. Plaintext apiKey trong RAM — KHÔNG persist/log. */
    @Transactional(readOnly = true)
    public LlmConfig getCurrent() {
        return repository.findById(1L)
                .map(this::fromEntity)
                .orElseGet(this::fromBootstrap);
    }

    @Transactional(readOnly = true)
    public LlmConfigResponse getCurrentMasked() {
        return repository.findById(1L)
                .map(entity -> new LlmConfigResponse(
                        "DATABASE",
                        entity.getBaseUrl(),
                        mask(encryptor.decrypt(entity.getApiKeyEncrypted())),
                        entity.getChatModel(),
                        entity.getUpdatedAt(),
                        entity.getUpdatedBy()))
                .orElseGet(() -> {
                    LlmConfig boot = fromBootstrap();
                    return new LlmConfigResponse(
                            "ENVIRONMENT",
                            boot.baseUrl(),
                            mask(boot.apiKey()),
                            boot.chatModel(),
                            null,
                            null);
                });
    }

    @Transactional
    public LlmConfigResponse save(SaveLlmConfigRequest request, String updatedBy) {
        String encrypted = encryptor.encrypt(request.apiKey());
        LlmConfigEntity entity = repository.findById(1L).orElse(null);
        if (entity == null) {
            entity = new LlmConfigEntity(request.baseUrl(), encrypted, request.chatModel(), updatedBy);
        } else {
            entity.update(request.baseUrl(), encrypted, request.chatModel(), updatedBy);
        }
        repository.save(entity);
        log.info("LLM config saved by user={} → baseUrl={}, model={}, apiKey={}",
                updatedBy, request.baseUrl(), request.chatModel(), mask(request.apiKey()));

        // Rebuild ChatClient với config mới — request tiếp theo dùng ngay.
        LlmConfig fresh = new LlmConfig(request.baseUrl(), request.apiKey(), request.chatModel());
        clientHolder.rebuild(fresh);
        log.info("ChatClient rebuilt with new LLM config");

        return getCurrentMasked();
    }

    /**
     * Ping LLM với 1 message "ping" để verify credential + endpoint hoạt động.
     * KHÔNG persist gì. Dùng OpenAIClient mới tạo, bỏ ngay sau khi xong.
     */
    public ValidateLlmConfigResponse validate(ValidateLlmConfigRequest request) {
        log.info("Validating LLM config: baseUrl={}, model={}, apiKey={}",
                request.baseUrl(), request.chatModel(), mask(request.apiKey()));
        OpenAIClient probe = null;
        try {
            probe = OpenAIOkHttpClient.builder()
                    .baseUrl(request.baseUrl())
                    .apiKey(request.apiKey())
                    .build();

            ChatCompletion response = probe.chat().completions().create(
                    ChatCompletionCreateParams.builder()
                            .model(request.chatModel())
                            .maxCompletionTokens(8L)
                            .addUserMessage("ping")
                            .build());

            String finishReason = response.choices().isEmpty()
                    ? "no-choices"
                    : response.choices().get(0).finishReason().toString();
            return new ValidateLlmConfigResponse(true, "ok (finishReason=" + finishReason + ")");
        } catch (Exception e) {
            log.warn("LLM validate failed: {}", e.getMessage());
            return new ValidateLlmConfigResponse(false, e.getMessage());
        } finally {
            // OpenAIOkHttpClient là AutoCloseable trong SDK mới; close best-effort.
            if (probe instanceof AutoCloseable c) {
                try { c.close(); } catch (Exception ignored) {}
            }
        }
    }

    private LlmConfig fromEntity(LlmConfigEntity entity) {
        String apiKey = encryptor.decrypt(entity.getApiKeyEncrypted());
        return new LlmConfig(entity.getBaseUrl(), apiKey, entity.getChatModel());
    }

    private LlmConfig fromBootstrap() {
        PetclinicAiProperties.Llm llm = bootstrapProperties.llm();
        return new LlmConfig(llm.baseUrl(), llm.apiKey(), llm.chatModel());
    }

    static String mask(String apiKey) {
        if (apiKey == null || apiKey.length() < 12) return "***";
        return apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length() - 4);
    }
}

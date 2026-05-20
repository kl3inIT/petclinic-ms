package com.mss301.petclinic.genai.admin;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Singleton-row config table (id luôn = 1). Đơn giản hơn versioning + tránh
 * race condition khi nhiều admin save song song (last-write-wins acceptable).
 *
 * <p>Phase 12c: 1 config cho cả cluster. Phase 13+ có thể tách per-tenant
 * (BYOK đa-tenant như zero-mail) — đổi PK sang tenant_id.
 */
@Entity
@Table(name = "ai_llm_config", schema = "genai")
public class LlmConfigEntity {

    @Id
    private Long id = 1L;

    @Column(name = "base_url", nullable = false, length = 256)
    private String baseUrl;

    /** AES-GCM ciphertext: "iv-b64:ct-b64". Plaintext key never persists. */
    @Column(name = "api_key_encrypted", nullable = false, length = 2048)
    private String apiKeyEncrypted;

    @Column(name = "chat_model", nullable = false, length = 128)
    private String chatModel;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", length = 64)
    private String updatedBy;

    protected LlmConfigEntity() {}

    public LlmConfigEntity(String baseUrl, String apiKeyEncrypted, String chatModel, String updatedBy) {
        this.id = 1L;
        this.baseUrl = baseUrl;
        this.apiKeyEncrypted = apiKeyEncrypted;
        this.chatModel = chatModel;
        this.updatedAt = Instant.now();
        this.updatedBy = updatedBy;
    }

    public void update(String baseUrl, String apiKeyEncrypted, String chatModel, String updatedBy) {
        this.baseUrl = baseUrl;
        this.apiKeyEncrypted = apiKeyEncrypted;
        this.chatModel = chatModel;
        this.updatedAt = Instant.now();
        this.updatedBy = updatedBy;
    }

    public Long getId() { return id; }
    public String getBaseUrl() { return baseUrl; }
    public String getApiKeyEncrypted() { return apiKeyEncrypted; }
    public String getChatModel() { return chatModel; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
}

package com.mss301.petclinic.auth.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * Opaque refresh token. Raw token KHÔNG bao giờ lưu — chỉ SHA-256 hash. Khi user gọi /refresh,
 * server hash token input rồi lookup. DB leak ≠ ability to use tokens.
 *
 * <p>Single-use rotation: mỗi refresh tạo token mới + revoke token cũ. Detect reuse → revoke all
 * tokens của user đó (token theft signal).</p>
 */
@Entity
@Table(name = "refresh_tokens",
        indexes = {
                @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id"),
                @Index(name = "idx_refresh_tokens_token_hash", columnList = "token_hash", unique = true)
        })
public class RefreshToken extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    /** SHA-256 hex của raw token (random UUID). Index unique. */
    @Column(name = "token_hash", nullable = false, length = 64, updatable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }

    public boolean isUsable(Instant now) {
        return !revoked && expiresAt.isAfter(now);
    }
}

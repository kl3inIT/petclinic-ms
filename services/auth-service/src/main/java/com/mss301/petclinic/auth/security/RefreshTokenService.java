package com.mss301.petclinic.auth.security;

import com.mss301.petclinic.auth.config.AuthProperties;
import com.mss301.petclinic.auth.model.RefreshToken;
import com.mss301.petclinic.auth.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Issue + validate refresh tokens. Raw token = random 256-bit hex (KHÔNG phải UUID — UUID có
 * structure bits, không đủ entropy). Lưu DB chỉ SHA-256 hash.
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repo;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repo, AuthProperties authProps) {
        this.repo = repo;
        this.ttl = authProps.refreshTokenTtl();
    }

    @Transactional
    public IssuedRefresh issue(UUID userId) {
        String raw = generateRaw();
        String hash = sha256(raw);

        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(hash);
        token.setExpiresAt(Instant.now().plus(ttl));
        token.setRevoked(false);
        repo.save(token);

        return new IssuedRefresh(raw, ttl.toSeconds());
    }

    /**
     * Rotation: verify input → revoke old → issue new. Single-use semantics.
     * Returns user id để issuer access token mới với current user state.
     */
    @Transactional
    public UUID consumeAndValidate(String rawToken) {
        String hash = sha256(rawToken);
        RefreshToken existing = repo.findByTokenHash(hash).orElse(null);
        if (existing == null || !existing.isUsable(Instant.now())) {
            // Token reuse detection: nếu token đã revoked → revoke MỌI token của user này
            // (signal attack — original token đã được dùng, attacker đang dùng leak).
            if (existing != null && existing.isRevoked()) {
                repo.revokeAllForUser(existing.getUserId());
            }
            throw new InvalidRefreshTokenException();
        }
        existing.setRevoked(true);
        repo.save(existing);
        return existing.getUserId();
    }

    @Transactional
    public int revokeAllForUser(UUID userId) {
        return repo.revokeAllForUser(userId);
    }

    private String generateRaw() {
        byte[] bytes = new byte[32];        // 256 bit
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record IssuedRefresh(String token, long expiresInSeconds) {}

    public static class InvalidRefreshTokenException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        public InvalidRefreshTokenException() { super("Invalid or expired refresh token"); }
    }
}

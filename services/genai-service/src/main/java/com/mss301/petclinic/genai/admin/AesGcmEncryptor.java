package com.mss301.petclinic.genai.admin;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AES-GCM (AEAD) encryptor cho LLM apiKey at rest. Key 256-bit base64 ở env
 * {@code petclinic.crypto.key}. NẾU env trống — auto-generate ephemeral key
 * cho dev (cảnh báo log, restart sẽ mất ciphertext cũ).
 *
 * <p>Ciphertext format: {@code <iv-b64>:<ciphertext-with-tag-b64>}. IV 12 byte
 * (GCM recommended). Auth tag 128-bit appended bởi cipher.
 *
 * <p>KHÔNG dùng AES/CBC — không có integrity (CBC + HMAC-SHA256 phức tạp + dễ sai).
 * GCM = encryption + authentication trong 1 mode.
 */
@Component
public class AesGcmEncryptor {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AesGcmEncryptor.class);

    private static final String ALG = "AES";
    private static final String TRANSFORM = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;             // 96-bit IV — NIST recommendation cho GCM
    private static final int TAG_LEN = 128;           // 128-bit auth tag
    private static final SecureRandom RNG = new SecureRandom();

    private final SecretKey key;

    public AesGcmEncryptor(@Value("${petclinic.crypto.key:}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            log.warn("petclinic.crypto.key is EMPTY — generating ephemeral AES-256 key. "
                    + "Encrypted apiKey rows will become UNREADABLE on restart. "
                    + "Set the env var in production.");
            byte[] keyBytes = new byte[32];
            RNG.nextBytes(keyBytes);
            this.key = new SecretKeySpec(keyBytes, ALG);
        } else {
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            if (keyBytes.length != 32) {
                throw new IllegalStateException(
                        "petclinic.crypto.key must be 32 bytes (base64-encoded AES-256). Got: " + keyBytes.length);
            }
            this.key = new SecretKeySpec(keyBytes, ALG);
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            RNG.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LEN, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(iv)
                    + ":" + Base64.getEncoder().encodeToString(ciphertext);
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM encryption failed", e);
        }
    }

    public String decrypt(String envelope) {
        try {
            int sep = envelope.indexOf(':');
            if (sep <= 0 || sep == envelope.length() - 1) {
                throw new IllegalArgumentException("Bad envelope format — expected 'iv-b64:ct-b64'");
            }
            byte[] iv = Base64.getDecoder().decode(envelope.substring(0, sep));
            byte[] ciphertext = Base64.getDecoder().decode(envelope.substring(sep + 1));
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LEN, iv));
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM decryption failed — wrong key or corrupted ciphertext", e);
        }
    }
}

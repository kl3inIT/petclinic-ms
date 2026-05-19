package com.mss301.petclinic.vets.config;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * S3-compatible storage config. MinIO local dev hoặc AWS S3 prod — chỉ cần thay
 * {@code endpoint} + credentials. Bucket phải tồn tại (compose.yaml auto-create
 * {@code avatars}/{@code pet-photos}/{@code invoices} ở dev).
 *
 * <p>Prefix convention trong bucket {@code avatars}:</p>
 * <ul>
 *   <li>{@code vets/photo/<vetId>} — avatar 1-1, overwrite khi upload mới</li>
 *   <li>{@code vets/album/<vetId>/<photoId>} — album gallery 1-N</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "petclinic.storage.minio")
@Validated
public record StorageProperties(
        @NotBlank String endpoint,
        @NotBlank String accessKey,
        @NotBlank String secretKey,
        @NotBlank @DefaultValue("avatars") String bucket,
        @NotNull @DefaultValue("PT1H") Duration presignedTtl,
        @Positive @DefaultValue("10485760") long maxFileSizeBytes  // 10 MB default
) {}

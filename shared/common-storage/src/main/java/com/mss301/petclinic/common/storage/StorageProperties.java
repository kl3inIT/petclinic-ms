package com.mss301.petclinic.common.storage;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * S3-compatible storage config. MinIO local dev hoặc AWS S3 prod — chỉ cần thay
 * {@code endpoint} + credentials. Bucket phải tồn tại trước (compose.yaml auto-create
 * ở dev). Mỗi service trỏ {@code bucket} riêng (vd {@code avatars} cho vets,
 * {@code prescriptions} cho visits) — object key do caller tự tính, module này
 * không biết domain.
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

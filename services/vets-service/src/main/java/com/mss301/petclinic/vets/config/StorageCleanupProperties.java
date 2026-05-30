package com.mss301.petclinic.vets.config;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Config cho orphan-cleanup job (Phase I). Object trên MinIO mà DB không reference được
 * sẽ bị xoá — nguyên nhân thường gặp: rollback transaction sau khi upload S3 xong, hoặc
 * crash giữa upload và DB save.
 *
 * <p>{@code minAge} là grace window để TRÁNH xoá nhầm object vừa upload — race điển hình:
 * {@code VetAlbumServiceImpl} saveAndFlush placeholder, upload S3, save lại object key thật.
 * Giữa 2 bước cuối, S3 đã có key "vets/album/X/Y" mà DB row vẫn là "placeholder" →
 * job thấy orphan giả. Window 1 giờ đủ rộng cho mọi upload bình thường.</p>
 *
 * <p>{@code enabled=false} tắt schedule (test profile dùng). {@code dryRun=true} chỉ log
 * danh sách orphan, không xoá — bật ở prod tuần đầu để verify trước khi unleash.</p>
 */
@ConfigurationProperties(prefix = "petclinic.storage.cleanup")
@Validated
public record StorageCleanupProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("false") boolean dryRun,
        @NotBlank @DefaultValue("0 0 3 * * *") String cron,
        @NotNull @DefaultValue("PT1H") Duration minAge
) {}

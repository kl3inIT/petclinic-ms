package com.mss301.petclinic.vets.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Activator cho {@link StorageCleanupProperties} (orphan-cleanup job — vet-specific).
 * {@code StorageProperties} (cấu hình MinIO chung) giờ do
 * {@code shared/common-storage} kích hoạt qua auto-config — không khai báo lại ở đây.
 */
@Configuration
@EnableConfigurationProperties(StorageCleanupProperties.class)
public class StoragePropertiesConfiguration {}

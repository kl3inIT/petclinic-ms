package com.mss301.petclinic.vets.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Activator cho {@link StorageCleanupProperties} (orphan-cleanup job — vet-specific).
 * Binary IO đi qua Go files-service; vets-service chỉ giữ cleanup policy gắn với
 * metadata review/gallery của vets.
 */
@Configuration
@EnableConfigurationProperties(StorageCleanupProperties.class)
public class StorageCleanupPropertiesConfiguration {}

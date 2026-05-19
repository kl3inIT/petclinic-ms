package com.mss301.petclinic.vets.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Activator cho {@link StorageProperties} — tách record (POJO) khỏi @Configuration
 * để giảm coupling test (xem CLAUDE.md "Configuration binding pattern").
 */
@Configuration
@EnableConfigurationProperties({StorageProperties.class, StorageCleanupProperties.class})
public class StoragePropertiesConfiguration {}

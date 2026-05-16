package com.mss301.petclinic.auth.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Activate {@link AuthProperties} binding. Tách @EnableConfigurationProperties khỏi POJO để
 * tránh circular dependency khi POJO bị import từ nhiều nơi.
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthPropertiesConfiguration {
}

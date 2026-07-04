package com.mss301.petclinic.vets.client;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "petclinic.files")
@Validated
public record FilesProperties(
        @NotBlank @DefaultValue("http://localhost:8193") String baseUrl,
        @NotBlank @DefaultValue("avatars") String bucket,
        @DefaultValue("PT1H") Duration presignedTtl,
        @Positive @DefaultValue("10485760") long maxFileSizeBytes
) {}

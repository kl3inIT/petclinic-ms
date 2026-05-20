package com.mss301.petclinic.genai.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveLlmConfigRequest(
        @NotBlank
        @Pattern(regexp = "^https?://.+", message = "must start with http:// or https://")
        @Size(max = 256)
        String baseUrl,

        @NotBlank
        @Size(min = 10, max = 1024)
        String apiKey,

        @NotBlank
        @Size(max = 128)
        @Pattern(regexp = "^[\\w./:-]+$", message = "alphanumeric + . / : - only")
        String chatModel
) {}

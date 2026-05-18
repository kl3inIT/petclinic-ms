package com.mss301.petclinic.genai.admin.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Validate trước khi save — gọi LLM endpoint 1 request nhỏ xem có 200 không.
 * Cùng shape với SaveLlmConfigRequest nhưng KHÔNG persist.
 */
public record ValidateLlmConfigRequest(
        @NotBlank String baseUrl,
        @NotBlank String apiKey,
        @NotBlank String chatModel
) {}

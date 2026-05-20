package com.mss301.petclinic.genai.admin.dto;

import java.time.Instant;

/**
 * Admin GET /current response. {@code apiKeyMasked} = 4 ký tự đầu + "..." +
 * 4 ký tự cuối (vd "sk-o...d691"). Plaintext KHÔNG bao giờ rời service.
 */
public record LlmConfigResponse(
        String source,           // "DATABASE" | "ENVIRONMENT"
        String baseUrl,
        String apiKeyMasked,
        String chatModel,
        Instant updatedAt,       // null nếu source = ENVIRONMENT
        String updatedBy         // null nếu source = ENVIRONMENT
) {}

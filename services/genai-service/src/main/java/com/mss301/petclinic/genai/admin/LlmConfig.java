package com.mss301.petclinic.genai.admin;

/**
 * Runtime LLM config — chỉ in memory, KHÔNG persist trực tiếp (entity riêng).
 * Field apiKey ở đây là PLAINTEXT (đã decrypt) — chỉ tồn tại trong RAM khi
 * service xử lý request, không log ra ngoài.
 */
public record LlmConfig(
        String baseUrl,
        String apiKey,
        String chatModel
) {}

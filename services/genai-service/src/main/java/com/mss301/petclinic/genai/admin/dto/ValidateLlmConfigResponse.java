package com.mss301.petclinic.genai.admin.dto;

public record ValidateLlmConfigResponse(
        boolean ok,
        String message
) {}

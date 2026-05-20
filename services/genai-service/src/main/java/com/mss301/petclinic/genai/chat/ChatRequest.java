package com.mss301.petclinic.genai.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Inbound chat message. {@code threadId} optional — null/blank = "default" thread cho user đó.
 * Multi-thread cho phép cùng user mở nhiều conversation song song (FE tabs).
 */
public record ChatRequest(
        @NotBlank
        @Size(max = 4000)
        String message,

        @Size(max = 64)
        String threadId
) {}

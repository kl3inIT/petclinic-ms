package com.mss301.petclinic.genai.chat;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Chat endpoint. POST /api/v1/ai/chat (qua gateway: /api/v1/ai/**).
 *
 * <h4>Memory keying</h4>
 * conversationId = {@code "u:<jwt-sub>:t:<threadId>"}. Mỗi user có nhiều thread; data tự
 * isolate vì conversationId chứa user UUID.
 *
 * <h4>Spring AI 2.0 API note</h4>
 * conversationId KHÔNG set ở {@code MessageChatMemoryAdvisor.builder().conversationId(...)}
 * nữa (1.x API, đã remove trong 2.0). Phải set per-request qua
 * {@code .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, id))}. Gotcha #34.
 */
@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Chat", description = "PetClinic AI assistant powered by Spring AI + MCP tools")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public ChatController(ChatClient chatClient, ChatMemory chatMemory) {
        this.chatClient = chatClient;
        this.chatMemory = chatMemory;
    }

    @PostMapping("/chat")
    @Operation(summary = "Send a chat message to the PetClinic AI assistant")
    public ChatReply chat(@Valid @RequestBody ChatRequest request,
                          @AuthenticationPrincipal Jwt jwt) {
        String threadId = (request.threadId() == null || request.threadId().isBlank())
                ? "default" : request.threadId();
        String conversationId = "u:" + jwt.getSubject() + ":t:" + threadId;

        log.info("Chat request: conversationId={}, message='{}'",
                conversationId, abbreviate(request.message()));

        String reply = chatClient.prompt()
                .system(SystemPrompts.GENERAL_ASSISTANT)
                .user(request.message())
                .advisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
                .call()
                .content();

        log.info("Chat reply: conversationId={}, length={}",
                conversationId, reply == null ? 0 : reply.length());
        return new ChatReply(reply, conversationId);
    }

    private static String abbreviate(String s) {
        if (s == null) return "";
        return s.length() <= 120 ? s : s.substring(0, 117) + "...";
    }
}

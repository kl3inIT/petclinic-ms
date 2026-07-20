package com.mss301.petclinic.genai.chat;

import java.util.Map;
import java.util.function.Consumer;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.ExternalServiceUnavailableException;
import com.mss301.petclinic.genai.config.LlmClientHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;
import tools.jackson.databind.ObjectMapper;

/**
 * Chat endpoint — WebFlux reactive stack. Both blocking and streaming calls use the
 * same configured {@code ChatClient}, including memory, RAG, and MCP tools.
 */
@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Chat", description = "PetClinic AI assistant — non-stream + true SSE streaming")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final LlmClientHolder clientHolder;
    private final ChatMemory chatMemory;
    private final ObjectMapper json;

    public ChatController(LlmClientHolder clientHolder, ChatMemory chatMemory, ObjectMapper json) {
        this.clientHolder = clientHolder;
        this.chatMemory = chatMemory;
        this.json = json;
    }

    @PostMapping(value = "/chat", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Send a chat message — uses tools + RAG, returns full response")
    public Mono<ChatReply> chat(@Valid @RequestBody ChatRequest request,
                                 @AuthenticationPrincipal Jwt jwt) {
        return Mono.fromCallable(() -> chatBlocking(request, jwt))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private ChatReply chatBlocking(ChatRequest request, Jwt jwt) {
        String conversationId = conversationId(jwt, request.threadId());
        log.info("Chat request: conversationId={}, message='{}'",
                conversationId, abbreviate(request.message()));

        if (!clientHolder.isReady()) {
            throw new ExternalServiceUnavailableException(
                    "llm (not configured — admin must POST /api/v1/admin/llm/config)", null);
        }

        String reply = clientHolder.chatClient().prompt()
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

    @PostMapping(value = "/chat/stream",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream chat response as an AI SDK UI Message Stream with MCP tool progress")
    public ResponseEntity<Flux<ServerSentEvent<String>>> chatStream(
            @Valid @RequestBody StreamChatRequest request, @AuthenticationPrincipal Jwt jwt) {
        String conversationId = conversationId(jwt, request.threadId());
        String userText = request.lastUserText();

        log.info("Chat stream request: conversationId={}, message='{}'",
                conversationId, abbreviate(userText));

        if (!clientHolder.isReady()) {
            throw new ExternalServiceUnavailableException(
                    "llm (not configured — admin must POST /api/v1/admin/llm/config)", null);
        }
        if (userText == null || userText.isBlank()) {
            throw new IllegalArgumentException("Last user message is empty");
        }

        Sinks.Many<Part> toolEvents = Sinks.many().unicast().onBackpressureBuffer();
        Consumer<Part> emitToolEvent = part -> toolEvents.tryEmitNext(part);
        Flux<Part> deltas = clientHolder.chatClient().prompt()
                .system(SystemPrompts.GENERAL_ASSISTANT)
                .user(userText)
                .toolContext(Map.of(EventEmittingToolManager.EVENTS_KEY, emitToolEvent))
                .advisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, conversationId))
                .stream()
                .content()
                .<Part>map(token -> new Part.TextDelta("text-0", token))
                .doFinally(signal -> toolEvents.tryEmitComplete());

        Flux<Part> text = deltas.switchOnFirst((signal, tokens) -> signal.hasValue()
                ? Flux.concat(Flux.just(new Part.TextStart("text-0")), tokens,
                        Flux.just(new Part.TextEnd("text-0")))
                : tokens);
        Flux<Part> stream = Flux.concat(
                Flux.just(new Part.StartStep()),
                Flux.merge(text, toolEvents.asFlux()),
                Flux.just(new Part.FinishStep()));

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header("x-vercel-ai-ui-message-stream", "v1")
                .body(UiMessageStream.encode(stream, json));
    }

    private static String conversationId(Jwt jwt, String threadId) {
        String t = (threadId == null || threadId.isBlank()) ? "default" : threadId;
        return "u:" + jwt.getSubject() + ":t:" + t;
    }

    private static String abbreviate(String s) {
        if (s == null) return "";
        return s.length() <= 120 ? s : s.substring(0, 117) + "...";
    }
}

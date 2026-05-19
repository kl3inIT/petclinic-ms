package com.mss301.petclinic.genai.chat;

import java.util.List;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mss301.petclinic.common.web.exception.ExternalServiceUnavailableException;
import com.mss301.petclinic.genai.config.LlmClientHolder;
import com.openai.client.OpenAIClient;
import com.openai.core.http.StreamResponse;
import com.openai.models.chat.completions.ChatCompletionChunk;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Chat endpoint — WebFlux reactive stack (Phase 12e).
 *
 * <h4>Two-pass pattern fix tool aggregation</h4>
 * Spring AI 2.0-M6 {@code OpenAiChatModel.internalStream()} luôn {@code .collectList().flatMapMany()}
 * để detect tool calls — biến mọi stream thành {@code Flux.just(aggregatedText)} (1 chunk khổng lồ),
 * mất per-token streaming. {@code /chat/stream} BYPASS Spring AI streaming layer:
 * <ol>
 *   <li><b>Pass 1 (blocking, boundedElastic):</b> manual RAG retrieval qua {@link VectorStore} +
 *       load chat history qua {@link ChatMemory}. Build {@link ChatCompletionCreateParams} với
 *       system+context+history+user, KHÔNG attach tools (streaming path bỏ tools để giữ token-by-token).</li>
 *   <li><b>Pass 2 (streaming):</b> gọi thẳng OpenAI Java SDK {@code createStreaming()}, adapt
 *       {@link StreamResponse} → {@link Flux} qua {@code Flux.using}. Mỗi delta.content() → 1 onNext
 *       → 1 HTTP chunk (Reactor + WebFlux native chunked encoding).</li>
 *   <li><b>Persist sau khi stream xong:</b> assistant message accumulated → {@code chatMemory.add()}.</li>
 * </ol>
 *
 * <p>Non-streaming {@code /chat} giữ {@code ChatClient.call()} với tools + RAG advisor — full feature.
 */
@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Chat", description = "PetClinic AI assistant — non-stream + true SSE streaming")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private static final int RAG_TOP_K = 3;

    private final LlmClientHolder clientHolder;
    private final ChatMemory chatMemory;

    public ChatController(LlmClientHolder clientHolder, ChatMemory chatMemory) {
        this.clientHolder = clientHolder;
        this.chatMemory = chatMemory;
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

    /**
     * Streaming endpoint — true per-token streaming via OpenAI SDK direct.
     *
     * <p>FE Vercel AI SDK {@code TextStreamChatTransport} consumes plain text chunked transfer
     * (mỗi onNext → 1 chunk UTF-8 text).
     */
    @PostMapping(value = "/chat/stream",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Stream chat response — true token-by-token (bypasses Spring AI aggregation)")
    public Flux<String> chatStream(@Valid @RequestBody StreamChatRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
        String conversationId = conversationId(jwt, request.threadId());
        String userText = request.lastUserText();

        log.info("Chat stream request: conversationId={}, message='{}'",
                conversationId, abbreviate(userText));

        if (!clientHolder.isReady()) {
            return Flux.error(new ExternalServiceUnavailableException(
                    "llm (not configured — admin must POST /api/v1/admin/llm/config)", null));
        }
        if (userText == null || userText.isBlank()) {
            return Flux.error(new IllegalArgumentException("Last user message is empty"));
        }

        StringBuilder accumulator = new StringBuilder();

        // Pass 1: build streaming params (RAG + memory load + persist user msg) — blocking.
        return Mono.fromCallable(() -> buildStreamingParams(conversationId, userText))
                .subscribeOn(Schedulers.boundedElastic())
                // Pass 2: OpenAI SDK streaming — Flux.using ensures StreamResponse.close().
                .flatMapMany(params -> streamCompletion(clientHolder.syncClient(), params))
                .doOnNext(accumulator::append)
                .doOnComplete(() -> persistAssistantMessage(conversationId, accumulator.toString()))
                .doOnError(e -> log.warn("Chat stream error: conversationId={}, err={}", conversationId, e.toString()));
    }

    private ChatCompletionCreateParams buildStreamingParams(String conversationId, String userText) {
        ChatCompletionCreateParams.Builder builder = ChatCompletionCreateParams.builder()
                .model(clientHolder.chatModelName());

        // System prompt + optional RAG context.
        StringBuilder systemMsg = new StringBuilder(SystemPrompts.GENERAL_ASSISTANT);
        VectorStore vectorStore = clientHolder.vectorStore();
        if (vectorStore != null) {
            try {
                List<Document> docs = vectorStore.similaritySearch(
                        SearchRequest.builder().query(userText).topK(RAG_TOP_K).build());
                if (docs != null && !docs.isEmpty()) {
                    systemMsg.append("\n\nRELEVANT CONTEXT (use when answering):\n");
                    for (Document d : docs) {
                        systemMsg.append("---\n").append(d.getText()).append("\n");
                    }
                }
            } catch (Exception e) {
                log.warn("RAG retrieval failed (ignored): {}", e.toString());
            }
        }
        builder.addSystemMessage(systemMsg.toString());

        // History — Spring AI ChatMemory keyed by conversationId.
        List<Message> history = chatMemory.get(conversationId);
        for (Message m : history) {
            String text = m.getText();
            if (text == null || text.isBlank()) continue;
            if (m.getMessageType() == MessageType.USER) {
                builder.addUserMessage(text);
            } else if (m.getMessageType() == MessageType.ASSISTANT) {
                builder.addAssistantMessage(text);
            }
        }

        // Current user message — persist BEFORE streaming (assistant persisted onComplete).
        chatMemory.add(conversationId, new UserMessage(userText));
        builder.addUserMessage(userText);

        return builder.build();
    }

    private static Flux<String> streamCompletion(OpenAIClient sync, ChatCompletionCreateParams params) {
        return Flux.using(
                () -> sync.chat().completions().createStreaming(params),
                stream -> Flux.fromStream(stream.stream())
                        .flatMapIterable(ChatCompletionChunk::choices)
                        .flatMap(choice -> choice.delta().content().map(Flux::just).orElse(Flux.empty())),
                StreamResponse::close
        ).subscribeOn(Schedulers.boundedElastic());
    }

    private void persistAssistantMessage(String conversationId, String text) {
        if (text == null || text.isBlank()) return;
        try {
            chatMemory.add(conversationId, new AssistantMessage(text));
            log.info("Chat stream completed: conversationId={}, replyLength={}", conversationId, text.length());
        } catch (Exception e) {
            log.warn("Failed to persist assistant message: {}", e.toString());
        }
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

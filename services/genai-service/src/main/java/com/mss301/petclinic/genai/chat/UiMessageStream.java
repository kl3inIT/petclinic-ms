package com.mss301.petclinic.genai.chat;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.codec.ServerSentEvent;

import reactor.core.publisher.Flux;
import tools.jackson.databind.ObjectMapper;

/** Encodes {@link Part} values as AI SDK UI Message Stream v1 SSE frames. */
final class UiMessageStream {

    static final Duration HEARTBEAT_INTERVAL = Duration.ofSeconds(15);

    private UiMessageStream() { }

    static Flux<ServerSentEvent<String>> encode(Flux<Part> source, ObjectMapper json) {
        return Flux.defer(() -> {
            Encoder encoder = new Encoder(json);
            Flux<ServerSentEvent<String>> live = withHeartbeat(source.map(encoder::part));
            return Flux.concat(
                    Flux.just(encoder.start()),
                    live,
                    Flux.just(encoder.finish(), encoder.done()))
                    .onErrorResume(error -> Flux.just(encoder.error(), encoder.done()));
        });
    }

    private static Flux<ServerSentEvent<String>> withHeartbeat(Flux<ServerSentEvent<String>> source) {
        return source.publish(shared -> {
            Flux<ServerSentEvent<String>> heartbeat = Flux.interval(HEARTBEAT_INTERVAL)
                    .map(ignored -> ServerSentEvent.<String>builder().comment("ping").build())
                    .takeUntilOther(shared.ignoreElements());
            return Flux.merge(shared, heartbeat);
        });
    }

    private static final class Encoder {

        private final ObjectMapper json;
        private final String messageId = UUID.randomUUID().toString();

        private Encoder(ObjectMapper json) {
            this.json = json;
        }

        ServerSentEvent<String> start() {
            return event(json.writeValueAsString(fields("type", "start", "messageId", messageId)));
        }

        ServerSentEvent<String> part(Part part) {
            return event(json.writeValueAsString(payload(part)));
        }

        ServerSentEvent<String> finish() {
            return event(json.writeValueAsString(fields("type", "finish", "finishReason", "stop")));
        }

        ServerSentEvent<String> error() {
            return event(json.writeValueAsString(fields(
                    "type", "error", "errorText", "The assistant stream failed.")));
        }

        ServerSentEvent<String> done() {
            return event("[DONE]");
        }

        private static Map<String, Object> payload(Part part) {
            return switch (part) {
                case Part.StartStep ignored -> fields("type", "start-step");
                case Part.FinishStep ignored -> fields("type", "finish-step");
                case Part.TextStart value -> fields("type", "text-start", "id", value.id());
                case Part.TextDelta value -> fields("type", "text-delta", "id", value.id(),
                        "delta", value.delta() == null ? "" : value.delta());
                case Part.TextEnd value -> fields("type", "text-end", "id", value.id());
                case Part.ToolInputStart value -> fields("type", "tool-input-start",
                        "toolCallId", value.toolCallId(), "toolName", value.toolName());
                case Part.ToolInputAvailable value -> fields("type", "tool-input-available",
                        "toolCallId", value.toolCallId(), "toolName", value.toolName(), "input", value.input());
                case Part.ToolOutputAvailable value -> fields("type", "tool-output-available",
                        "toolCallId", value.toolCallId(), "output", value.output());
                case Part.ToolOutputError value -> fields("type", "tool-output-error",
                        "toolCallId", value.toolCallId(), "errorText", value.errorText());
            };
        }

        private static ServerSentEvent<String> event(String data) {
            return ServerSentEvent.builder(data).build();
        }

        private static Map<String, Object> fields(Object... keyValues) {
            Map<String, Object> map = new LinkedHashMap<>();
            for (int index = 0; index < keyValues.length; index += 2) {
                map.put((String) keyValues[index], keyValues[index + 1]);
            }
            return map;
        }
    }
}

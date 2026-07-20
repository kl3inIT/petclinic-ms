package com.mss301.petclinic.genai.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.codec.ServerSentEvent;

import reactor.core.publisher.Flux;
import tools.jackson.databind.ObjectMapper;

class UiMessageStreamTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void encodesTextAndToolProgressAsAiSdkUiMessageFrames() {
        List<String> data = UiMessageStream.encode(
                        Flux.just(
                                new Part.StartStep(),
                                new Part.ToolInputStart("call-1", "findOwners"),
                                new Part.ToolInputAvailable("call-1", "findOwners", java.util.Map.of("name", "Lan")),
                                new Part.ToolOutputAvailable("call-1", List.of("Lan Nguyen")),
                                new Part.FinishStep(),
                                new Part.StartStep(),
                                new Part.TextStart("text-0"),
                                new Part.TextDelta("text-0", "Found one owner."),
                                new Part.TextEnd("text-0"),
                                new Part.FinishStep()),
                        json)
                .map(ServerSentEvent::data)
                .collectList()
                .block();

        assertThat(data).isNotNull();
        assertThat(data.getFirst()).contains("\"type\":\"start\"");
        assertThat(data.subList(1, data.size())).containsExactly(
                "{\"type\":\"start-step\"}",
                "{\"type\":\"tool-input-start\",\"toolCallId\":\"call-1\",\"toolName\":\"findOwners\"}",
                "{\"type\":\"tool-input-available\",\"toolCallId\":\"call-1\",\"toolName\":\"findOwners\",\"input\":{\"name\":\"Lan\"}}",
                "{\"type\":\"tool-output-available\",\"toolCallId\":\"call-1\",\"output\":[\"Lan Nguyen\"]}",
                "{\"type\":\"finish-step\"}",
                "{\"type\":\"start-step\"}",
                "{\"type\":\"text-start\",\"id\":\"text-0\"}",
                "{\"type\":\"text-delta\",\"id\":\"text-0\",\"delta\":\"Found one owner.\"}",
                "{\"type\":\"text-end\",\"id\":\"text-0\"}",
                "{\"type\":\"finish-step\"}",
                "{\"type\":\"finish\",\"finishReason\":\"stop\"}",
                "[DONE]");
    }

    @Test
    void failureKeepsProviderDetailsOutOfTheProtocol() {
        List<String> data = UiMessageStream.encode(Flux.error(new IllegalStateException("provider secret")), json)
                .map(ServerSentEvent::data)
                .collectList()
                .block();

        assertThat(data).contains("{\"type\":\"error\",\"errorText\":\"The assistant stream failed.\"}", "[DONE]")
                .doesNotContain("provider secret");
    }
}

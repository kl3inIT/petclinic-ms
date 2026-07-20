package com.mss301.petclinic.genai.chat;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionResult;
import org.springframework.ai.tool.definition.ToolDefinition;

import tools.jackson.databind.ObjectMapper;

/** Mirrors Spring AI tool execution into the live UI Message Stream when requested. */
final class EventEmittingToolManager implements ToolCallingManager {

    static final String EVENTS_KEY = "petclinicAiToolEvents";

    private final ToolCallingManager delegate;
    private final ObjectMapper json;

    EventEmittingToolManager(ToolCallingManager delegate, ObjectMapper json) {
        this.delegate = delegate;
        this.json = json;
    }

    @Override
    public List<ToolDefinition> resolveToolDefinitions(ToolCallingChatOptions chatOptions) {
        return delegate.resolveToolDefinitions(chatOptions);
    }

    @Override
    public ToolExecutionResult executeToolCalls(Prompt prompt, ChatResponse chatResponse) {
        Consumer<Part> emit = sink(prompt);
        var generation = chatResponse.getResult();
        List<AssistantMessage.ToolCall> calls = generation == null
                ? List.of()
                : generation.getOutput().getToolCalls();

        if (emit != null) {
            for (AssistantMessage.ToolCall call : calls) {
                emit.accept(new Part.ToolInputStart(call.id(), call.name()));
                emit.accept(new Part.ToolInputAvailable(call.id(), call.name(), parse(call.arguments())));
            }
        }

        ToolExecutionResult result;
        try {
            result = delegate.executeToolCalls(prompt, chatResponse);
        } catch (RuntimeException failure) {
            if (emit != null) {
                for (AssistantMessage.ToolCall call : calls) {
                    emit.accept(new Part.ToolOutputError(call.id(), "Tool execution failed."));
                }
            }
            throw failure;
        }

        if (emit != null && !calls.isEmpty()) {
            List<Message> history = result.conversationHistory();
            if (!history.isEmpty() && history.getLast() instanceof ToolResponseMessage toolResponse) {
                for (ToolResponseMessage.ToolResponse response : toolResponse.getResponses()) {
                    emit.accept(new Part.ToolOutputAvailable(response.id(), parse(response.responseData())));
                }
            }
            emit.accept(new Part.FinishStep());
            emit.accept(new Part.StartStep());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private static Consumer<Part> sink(Prompt prompt) {
        if (prompt.getOptions() instanceof ToolCallingChatOptions options) {
            Map<String, Object> context = options.getToolContext();
            if (context != null && context.get(EVENTS_KEY) instanceof Consumer<?> consumer) {
                return (Consumer<Part>) consumer;
            }
        }
        return null;
    }

    private Object parse(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        try {
            return json.readValue(value, Object.class);
        } catch (RuntimeException ignored) {
            return value;
        }
    }
}

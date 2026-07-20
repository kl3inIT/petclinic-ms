package com.mss301.petclinic.genai.chat;

/**
 * The AI SDK UI Message Stream parts emitted by the PetClinic assistant.
 *
 * <p>The web client consumes these frames directly through {@code useChat}, so
 * text and MCP tool progress remain one transport contract instead of a
 * project-specific protocol.</p>
 */
sealed interface Part {

    record StartStep() implements Part { }

    record FinishStep() implements Part { }

    record TextStart(String id) implements Part { }

    record TextDelta(String id, String delta) implements Part { }

    record TextEnd(String id) implements Part { }

    record ToolInputStart(String toolCallId, String toolName) implements Part { }

    record ToolInputAvailable(String toolCallId, String toolName, Object input) implements Part { }

    record ToolOutputAvailable(String toolCallId, Object output) implements Part { }

    record ToolOutputError(String toolCallId, String errorText) implements Part { }
}

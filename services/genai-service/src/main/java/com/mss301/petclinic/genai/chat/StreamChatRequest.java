package com.mss301.petclinic.genai.chat;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Body Vercel AI SDK {@code useChat} POST khi dùng {@code TextStreamChatTransport}.
 *
 * <p>Shape khớp với {@code UIMessage[]} của AI SDK v5:
 * <pre>
 * {
 *   "messages": [
 *     { "id": "...", "role": "user", "parts": [{ "type": "text", "text": "hello" }] }
 *   ]
 * }
 * </pre>
 *
 * <p>BE chỉ lấy USER message cuối → feed vào ChatClient. Conversation history quản
 * qua {@code JdbcChatMemoryRepository} (server-side), KHÔNG dùng messages array
 * client gửi (tránh client tamper history).
 */
public record StreamChatRequest(
        @NotEmpty
        List<UiMessage> messages,
        String threadId
) {

    /** Lấy text của user message cuối cùng trong array. */
    public String lastUserText() {
        for (int i = messages.size() - 1; i >= 0; i--) {
            UiMessage message = messages.get(i);
            if ("user".equalsIgnoreCase(message.role())) {
                return message.text();
            }
        }
        return "";
    }

    public record UiMessage(String id, String role, List<UiMessagePart> parts) {
        public String text() {
            if (parts == null) return "";
            StringBuilder sb = new StringBuilder();
            for (UiMessagePart part : parts) {
                if ("text".equals(part.type()) && part.text() != null) {
                    sb.append(part.text());
                }
            }
            return sb.toString();
        }
    }

    public record UiMessagePart(String type, String text) {}
}

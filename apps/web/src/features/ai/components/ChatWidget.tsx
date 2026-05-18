/**
 * Chat widget — Vercel AI SDK v5 useChat + AI Elements components.
 *
 * Streaming: BE POST /api/v1/ai/chat/stream trả Flux<String> (Spring AI ChatClient
 * .stream().content()) → Spring MVC chunked HTTP → TextStreamChatTransport accumulate
 * text chunks → render real-time.
 *
 * JWT: TextStreamChatTransport.fetch wrapper inject Bearer token. Base path '/api/v1/...'
 * resolve qua Vite dev proxy → gateway :8180.
 */
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, type UIMessage } from 'ai';
import { Bot, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { useAuthStore } from '@/features/auth/store';

const THREAD_KEY = 'petclinic.ai.threadId';
const MESSAGES_KEY = 'petclinic.ai.messages';
const MAX_PERSISTED = 50;

function loadOrCreateThread(): string {
  let id = localStorage.getItem(THREAD_KEY);
  if (!id) {
    id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(THREAD_KEY, id);
  }
  return id;
}

/** Load UIMessage[] đã persist. Schema sai → trả [] thay vì crash. */
function loadPersistedMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is UIMessage =>
        typeof m === 'object' && m !== null && 'id' in m && 'role' in m && 'parts' in m,
    );
  } catch {
    return [];
  }
}

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => loadOrCreateThread());

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/v1/ai/chat/stream',
        body: { threadId },
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers);
          if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
          return fetch(url, { ...init, headers });
        },
      }),
    [accessToken, threadId],
  );

  const { messages, sendMessage, status, error, stop, regenerate, setMessages } = useChat({
    transport,
    messages: loadPersistedMessages(),
  });

  // Persist sau mỗi message change. Cap MAX_PERSISTED tránh localStorage phình to.
  useEffect(() => {
    try {
      const tail = messages.slice(-MAX_PERSISTED);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(tail));
    } catch {
      // QuotaExceeded → bỏ qua. Dữ liệu vẫn còn trong-mem.
    }
  }, [messages]);

  if (!user) return null;

  const isStreaming = status === 'streaming' || status === 'submitted';

  const resetConversation = () => {
    setMessages([]);
    localStorage.removeItem(THREAD_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    setThreadId(loadOrCreateThread());
  };

  return (
    <>
      {!open && (
        <Button
          size="icon"
          aria-label="Mở AI assistant"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="size-6" />
        </Button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[600px] w-[420px] flex-col rounded-lg border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">PetClinic Assistant</div>
                <div className="text-xs text-muted-foreground">
                  Hỏi về owners, vets, visits — tôi tự tra cứu
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={resetConversation}
                title="Reset conversation"
              >
                <RotateCcw className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </header>

          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Sparkles className="size-8 text-muted-foreground" />}
                  title="Bắt đầu hội thoại"
                  description="Vd: 'tìm vet chuyên radiology', 'có bao nhiêu owners?'"
                />
              ) : (
                messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role === 'user' ? 'user' : 'assistant'}
                  >
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        if (part.type === 'text') {
                          return <span key={i}>{part.text}</span>;
                        }
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                ))
              )}
              {error && (
                <div className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  ⚠️ {error.message || 'Đã có lỗi xảy ra'}
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0 text-xs"
                    onClick={() => regenerate()}
                  >
                    Thử lại
                  </Button>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput
            onSubmit={(message: PromptInputMessage) => {
              const text = message.text.trim();
              if (!text || isStreaming) return;
              void sendMessage({ text });
            }}
            className="rounded-b-lg border-x-0 border-b-0"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Hỏi gì đó về clinic…"
                disabled={isStreaming}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit status={status} onStop={() => stop()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      )}
    </>
  );
}

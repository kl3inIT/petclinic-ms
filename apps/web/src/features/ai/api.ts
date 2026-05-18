/**
 * AI API hooks — manual TanStack Query wrappers gọi qua apiClient.
 *
 * Khi BE đang chạy, có thể swap sang orval-generated (`lib/api/generated/ai-chat/*`
 * + `admin-llm/*`) — shape identical, chỉ đổi import. Hiện viết tay để FE compile
 * được trước khi orval gen pull spec lần đầu.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// ---------- types ----------

export interface ChatRequest {
  message: string;
  threadId?: string;
}

export interface ChatReply {
  reply: string;
  conversationId: string;
}

export interface LlmConfigResponse {
  source: 'DATABASE' | 'ENVIRONMENT';
  baseUrl: string;
  apiKeyMasked: string;
  chatModel: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SaveLlmConfigRequest {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
}

export interface ValidateLlmConfigRequest {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
}

export interface ValidateLlmConfigResponse {
  ok: boolean;
  message: string;
}

// ---------- chat ----------

export function useChat() {
  return useMutation({
    mutationFn: async (request: ChatRequest): Promise<ChatReply> => {
      const { data } = await apiClient.post<ChatReply>('/api/v1/ai/chat', request);
      return data;
    },
  });
}

// ---------- admin LLM config ----------

const LLM_CONFIG_KEY = ['admin', 'llm', 'current'] as const;

export function useLlmConfigCurrent() {
  return useQuery({
    queryKey: LLM_CONFIG_KEY,
    queryFn: async (): Promise<LlmConfigResponse> => {
      const { data } = await apiClient.get<LlmConfigResponse>('/api/v1/admin/llm/current');
      return data;
    },
  });
}

export function useSaveLlmConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: SaveLlmConfigRequest): Promise<LlmConfigResponse> => {
      const { data } = await apiClient.post<LlmConfigResponse>(
        '/api/v1/admin/llm/config',
        request,
      );
      return data;
    },
    onSuccess: (data) => qc.setQueryData(LLM_CONFIG_KEY, data),
  });
}

export function useValidateLlmConfig() {
  return useMutation({
    mutationFn: async (
      request: ValidateLlmConfigRequest,
    ): Promise<ValidateLlmConfigResponse> => {
      const { data } = await apiClient.post<ValidateLlmConfigResponse>(
        '/api/v1/admin/llm/validate',
        request,
      );
      return data;
    },
  });
}

export function useTestCurrentLlmConfig() {
  return useMutation({
    mutationFn: async (): Promise<ValidateLlmConfigResponse> => {
      const { data } = await apiClient.post<ValidateLlmConfigResponse>(
        '/api/v1/admin/llm/test',
      );
      return data;
    },
  });
}

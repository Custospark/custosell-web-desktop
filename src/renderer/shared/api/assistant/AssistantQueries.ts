import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ASSISTANT } from '../endpoints/endpoints';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  data: { reply: string; session?: { id: number; title: string } | null };
}

export interface ChatSession {
  id: number;
  title: string;
  messages_count?: number;
  updated_at?: string | null;
}

export interface ChatSessionDetail {
  id: number;
  title: string;
  updated_at?: string | null;
  messages: AssistantMessage[];
}

export const assistantSessionKeys = {
  all: ['assistant-sessions'] as const,
  list: () => [...assistantSessionKeys.all, 'list'] as const,
  detail: (id: number) => [...assistantSessionKeys.all, 'detail', id] as const,
};

/** Session history only exists for signed-in users - guests stay ephemeral. */
export function useChatSessions(enabled: boolean) {
  return useQuery({
    queryKey: assistantSessionKeys.list(),
    enabled,
    queryFn: async (): Promise<ChatSession[]> => {
      const { data } = await axiosInstance.get('/assistant/sessions');
      return (data?.data ?? []) as ChatSession[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRenameChatSession() {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const { data } = await axiosInstance.patch(`/assistant/sessions/${id}`, { title });
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assistantSessionKeys.list() });
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not rename chat'));
    },
  });
}

export function useDeleteChatSession() {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/assistant/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assistantSessionKeys.list() });
      showToast('success', 'Chat deleted');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete chat'));
    },
  });
}

/** Backend proxy keeps the provider key server-side; the app never sees it. */
let activeChatController: AbortController | null = null;

/** Abort the in-flight reply (Stop button). The next error surfaces as a cancel, never a failure card. */
export function abortAssistantChat(): void {
  activeChatController?.abort();
  activeChatController = null;
}

export interface ChatSendPayload {
  messages: AssistantMessage[];
  sessionId?: number | null;
}

export interface ChatSendResult {
  reply: string;
  session: { id: number; title: string } | null;
}

export function useAssistantChat() {
  // Guests (landing/auth) get how-to answers; members get live business data.
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return useMutation<ChatSendResult, Error, ChatSendPayload>({
    mutationFn: async ({ messages, sessionId }) => {
      const controller = new AbortController();
      activeChatController = controller;
      try {
        const { data } = await axiosInstance.post<ChatResponse>(
          isAuthenticated ? ASSISTANT.CHAT : ASSISTANT.GUIDE,
          sessionId ? { messages, session_id: sessionId } : { messages },
          // A full agent turn can span several provider rounds - outlast it
          // instead of aborting a reply the server is still producing.
          { timeout: 240000, signal: controller.signal },
        );
        return { reply: data.data.reply, session: data.data.session ?? null };
      } catch (err) {
        throw new Error(assistantErrorMessage(err), { cause: err });
      } finally {
        if (activeChatController === controller) {
          activeChatController = null;
        }
      }
    },
  });
}

/** Backend still names Oscar in places - rewrite to server-worded, actionable copy client-side. */
function debrandErrorMessage(message: string): string {
  if (!/oscar/i.test(message)) return message;
  if (/could not reach/i.test(message)) return 'Could not reach the server, please try again.';
  if (/busy|limit/i.test(message)) return 'The server is busy right now. Wait a moment and try again.';
  if (/empty answer|rephras/i.test(message)) return 'The server returned an empty answer. Try rephrasing.';
  if (/trouble answering/i.test(message)) return 'The server had trouble answering. Try again in a moment.';
  return 'Could not reach the server, please try again.';
}

export function assistantErrorMessage(err: unknown): string {
  if (!navigator.onLine || (axios.isAxiosError(err) && !err.response)) {
    return 'You appear to be offline. Your message is kept - try again when reconnected.';
  }
  if (axios.isAxiosError(err)) {
    const backend = (err.response?.data as { message?: string } | undefined)?.message;
    if (backend) return debrandErrorMessage(backend);
    if (err.response?.status === 429) return 'Too many chats at once. Wait a moment and try again.';
  }
  return 'Could not reach the server, please try again.';
}

import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ASSISTANT } from '../endpoints/endpoints';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  data: { reply: string };
}

/** Backend proxy keeps the provider key server-side; the app never sees it. */
export function useAssistantChat() {
  // Guests (landing/auth) get how-to answers; members get live business data.
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return useMutation<string, Error, AssistantMessage[]>({
    mutationFn: async (messages) => {
      try {
        const { data } = await axiosInstance.post<ChatResponse>(
          isAuthenticated ? ASSISTANT.CHAT : ASSISTANT.GUIDE,
          { messages },
          // Free-tier models answer slowly - outlast them instead of timing out.
          { timeout: 90000 },
        );
        return data.data.reply;
      } catch (err) {
        throw new Error(assistantErrorMessage(err), { cause: err });
      }
    },
  });
}

export function assistantErrorMessage(err: unknown): string {
  if (!navigator.onLine || (axios.isAxiosError(err) && !err.response)) {
    return 'You appear to be offline. Your message is kept - try again when reconnected.';
  }
  if (axios.isAxiosError(err)) {
    const backend = (err.response?.data as { message?: string } | undefined)?.message;
    if (backend) return backend;
    if (err.response?.status === 429) return 'Too many chats at once. Wait a moment and try again.';
  }
  return 'Could not reach the server, please try again.';
}

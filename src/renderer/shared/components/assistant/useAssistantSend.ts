import type { UseMutationResult } from '@tanstack/react-query';
import {
  type AssistantMessage,
  type ChatSendPayload,
  type ChatSendResult,
} from '../../api/assistant/AssistantQueries';

interface AssistantSendDeps {
  chat: UseMutationResult<ChatSendResult, Error, ChatSendPayload>;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  setDraft: (value: string) => void;
  setError: (value: string | null) => void;
  isAuthenticated: boolean;
  activeSessionId: number | null;
  adoptSession: (session: { id: number; title: string } | null) => void;
  ignoreCancel: (err: unknown) => boolean;
  /**
   * Monotonic turn counter. Bumped on every send AND every stop so a late
   * provider response from a stopped turn can never surface afterwards.
   */
  generationRef: { current: number };
}

/**
 * All outbound chat traffic: fresh sends, branch resends after an edit,
 * error-card retries, and answer regeneration. Replies append through one
 * shared mutation handler so session adoption and cancel-silencing stay
 * identical everywhere.
 */
export function useAssistantSend(deps: AssistantSendDeps) {
  const {
    chat,
    messages,
    setMessages,
    setDraft,
    setError,
    isAuthenticated,
    activeSessionId,
    adoptSession,
    ignoreCancel,
    generationRef,
  } = deps;

  function requestReply(payload: AssistantMessage[]): void {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    chat.mutate(
      { messages: payload, sessionId: isAuthenticated ? activeSessionId : undefined },
      {
        onSuccess: (result) => {
          if (generationRef.current !== generation) return;
          setMessages((prev) => [...prev, { role: 'assistant' as const, content: result.reply }].slice(-20));
          adoptSession(result.session);
        },
        onError: (err) => {
          if (generationRef.current !== generation) return;
          if (!ignoreCancel(err)) setError(err.message);
        },
      },
    );
  }

  /** Append a user message onto a base thread (full history or an edited branch). */
  function submitMessages(base: AssistantMessage[], content: string): boolean {
    const text = content.trim();
    if (!text || chat.isPending) return false;
    const next: AssistantMessage[] = [...base, { role: 'user' as const, content: text }].slice(-20);
    setMessages(next);
    setDraft('');
    setError(null);
    requestReply(next);
    return true;
  }

  function send(content: string): boolean {
    return submitMessages(messages, content);
  }

  /** Error-card retry: same payload again, nothing appended. */
  function resendLast(): void {
    if (chat.isPending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setError(null);
    requestReply(messages);
  }

  /** Fresh answer for the same question: drops a trailing assistant reply first. */
  function regenerate(): void {
    if (chat.isPending) return;
    const trimmed = [...messages];
    if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === 'assistant') {
      trimmed.pop();
    }
    const lastUser = [...trimmed].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setError(null);
    setMessages(trimmed);
    requestReply(trimmed);
  }

  return { send, submitMessages, resendLast, regenerate };
}

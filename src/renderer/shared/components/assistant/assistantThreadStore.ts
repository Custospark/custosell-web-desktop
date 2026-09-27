import { useEffect } from 'react';
import { axiosInstance } from '../../../app/api/axiosConfig';
import type { AssistantMessage, ChatSessionDetail } from '../../api/assistant/AssistantQueries';

/**
 * Thread persistence for the assistant widget. Signed-in members resume
 * their server-side session id; guests (no account, no server sessions)
 * keep their thread in this browser only. Every helper is storage-safe
 * (private mode never throws into the UI).
 */
const GUEST_THREAD_KEY = 'assistant-guest-thread';

export const ASSISTANT_THREAD_WINDOW = 20;

export function sessionStorageKey(userId: number): string {
  return `assistant-active-session:${userId}`;
}

export function isStoredThread(value: unknown): value is AssistantMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is AssistantMessage =>
        typeof item === 'object' &&
        item !== null &&
        ((item as { role?: unknown }).role === 'user' ||
          (item as { role?: unknown }).role === 'assistant') &&
        typeof (item as { content?: unknown }).content === 'string',
    )
  );
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode - the chat works, it just will not resume.
  }
}

function clear(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures - in-memory state is already correct.
  }
}

/** Last guest thread, validated, or null when absent/corrupt. */
export function loadGuestThread(): AssistantMessage[] | null {
  const raw = read(GUEST_THREAD_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStoredThread(parsed) && parsed.length > 0) {
      return parsed.slice(-ASSISTANT_THREAD_WINDOW);
    }
  } catch {
    // Corrupt cache - start fresh.
  }
  return null;
}

export function saveGuestThread(messages: AssistantMessage[]): void {
  write(GUEST_THREAD_KEY, JSON.stringify(messages.slice(-ASSISTANT_THREAD_WINDOW)));
}

/** Last active session id for a signed-in user, or null. */
export function loadActiveSessionId(userId: number): number | null {
  const raw = read(sessionStorageKey(userId));
  const id = raw != null ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? (id as number) : null;
}

export function saveActiveSessionId(userId: number, sessionId: number): void {
  write(sessionStorageKey(userId), String(sessionId));
}

export function clearActiveSessionId(userId: number): void {
  clear(sessionStorageKey(userId));
}

interface ThreadRestoreDeps {
  isAuthenticated: boolean;
  userId: number | null;
  messages: AssistantMessage[];
  setMessages: (messages: AssistantMessage[]) => void;
  setError: (error: string | null) => void;
  setView: (view: 'chat' | 'sessions') => void;
  setActiveSessionId: (id: number | null) => void;
}

/**
 * Thread continuity effects: guests restore/save their browser-only
 * thread, members silently resume their server-side session. All state
 * updates stay inside promise callbacks.
 */
export function useAssistantThreadRestore(deps: ThreadRestoreDeps): void {
  const { isAuthenticated, userId, messages, setMessages, setError, setView, setActiveSessionId } = deps;

  useEffect(() => {
    if (isAuthenticated || messages.length > 0) return;
    const cached = loadGuestThread();
    if (cached) {
      Promise.resolve(cached).then((thread) => {
        setMessages(thread);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    saveGuestThread(messages);
  }, [messages, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || userId == null || messages.length > 0) return;
    const id = loadActiveSessionId(userId);
    if (id === null) return;
    let cancelled = false;
    axiosInstance
      .get<{ data: ChatSessionDetail }>(`/assistant/sessions/${id}`)
      .then(({ data }) => {
        if (cancelled) return;
        setActiveSessionId(data.data.id);
        setMessages(data.data.messages ?? []);
        setError(null);
        setView('chat');
      })
      .catch(() => {
        if (cancelled) return;
        clearActiveSessionId(userId);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronsRight, History, SquarePen, X } from 'lucide-react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { NAV_GROUP_MODULE, resolveModuleForPath } from '../../utils/moduleAccess';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { usePlanAccessibleModules } from '../../utils/usePlanAccessibleModules';
import { resolveAccessibleNavGroups } from '../layout/resolveAccessibleNavLeaves';
import { getUserFirstName } from '../../utils/userDisplayName';
import {
  useAssistantChat,
  abortAssistantChat,
  useChatSessions,
  useRenameChatSession,
  useDeleteChatSession,
  assistantSessionKeys,
  type AssistantMessage,
  type ChatSessionDetail,
} from '../../api/assistant/AssistantQueries';
import { useConfirm } from '../Feedback/ConfirmContext';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { axiosInstance } from '../../../app/api/axiosConfig';
import oscarAvatar from '../../assets/oscar.webp';
import {
  GROUP_PROMPTS,
  PLACEHOLDER_BY_SLUG,
  SEGMENT_COPY,
  VIEW_CONTEXTS,
  type AssistantSegment,
} from './assistantContent';
import { AiBadge, AssistantLockup } from './AssistantBrand';
import { AssistantSessionsPanel } from './AssistantSessionsPanel';
import { AssistantThread } from './AssistantThread';
import { AssistantComposer } from './AssistantComposer';

export function AssistantWidget() {
  const { state, dispatch } = useAppContext();
  const open = state.assistantOpen;
  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    if (typeof value === 'function') {
      dispatch({ type: 'TOGGLE_ASSISTANT' });
    } else {
      dispatch({ type: 'SET_ASSISTANT_OPEN', payload: value });
    }
  };
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const accountType = useAppSelector((s) => s.auth.user?.account_type);
  const hasBusiness = useAppSelector((s) => s.auth.user?.business_id != null);
  const chat = useAssistantChat();
  const listRef = useRef<HTMLDivElement>(null);
  const segment: AssistantSegment = !isAuthenticated
    ? 'guest'
    : accountType === 'storefront_buyer'
      ? 'shopping'
      : accountType === 'personal' || !hasBusiness
        ? 'personal'
        : 'business';
  const copy = SEGMENT_COPY[segment];
  const user = useAppSelector((s) => s.auth.user);
  // Named welcome for signed-in users; guests keep the generic intro.
  const greetingName = isAuthenticated ? getUserFirstName(user?.name, '') : '';
  const planModules = usePlanAccessibleModules();
  const groupLabels = useMemo(
    () => resolveAccessibleNavGroups(user, planModules).map((group) => group.label),
    [user, planModules],
  );
  // Pool: prompts of visible sidebar modules first, segment fallbacks fill up.
  // Hidden or ungranted apps never suggest themselves.
  const promptPool = useMemo(() => {
    const pool = groupLabels.flatMap((label) => GROUP_PROMPTS[label] ?? []);
    for (const fallback of copy.prompts) {
      if (!pool.includes(fallback)) pool.push(fallback);
    }
    return pool;
  }, [groupLabels, copy]);
  // Route-detected: prompts executable in the module the user is standing in.
  const location = useLocation();
  const currentSlug = resolveModuleForPath(location.pathname);
  const routePlaceholder = currentSlug ? PLACEHOLDER_BY_SLUG[currentSlug] : undefined;
  // Table/view-aware: the exact list on screen wins over module-level.
  const viewContext = useMemo(
    () => VIEW_CONTEXTS.find((view) => view.match.test(location.pathname)) ?? null,
    [location.pathname],
  );
  const placeholder = viewContext?.placeholder ?? routePlaceholder ?? copy.input;
  const currentModulePrompts = useMemo(() => {
    if (viewContext) return new Set(viewContext.prompts);
    const labels = groupLabels.filter((label) => NAV_GROUP_MODULE[label] === currentSlug);
    return new Set(labels.flatMap((label) => GROUP_PROMPTS[label] ?? []));
  }, [groupLabels, currentSlug, viewContext]);
  function shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  // Fresh random 3 every time the empty state shows - current module first,
  // then the rest shuffled. Never the same twice.
  const [prompts, setPrompts] = useState<string[]>([]);
  useEffect(() => {
    if (!open || messages.length > 0 || promptPool.length === 0) return;
    queueMicrotask(() => {
      // Context (table/view, else module) leads; the user is looking at it.
      const current = shuffle([...currentModulePrompts]);
      const rest = shuffle(promptPool.filter((p) => !currentModulePrompts.has(p)));
      setPrompts([...current, ...rest].slice(0, 3));
    });
  }, [open, messages.length, promptPool, currentModulePrompts]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  // Follow-ups like popular AI tools: rank pool prompts by word overlap with
  // the last question, excluding anything already asked. Never suggests
  // hidden or ungranted apps - the pool only ever holds visible modules.
  const followUps = useMemo(() => {
    if (messages.length === 0 || chat.isPending) return [];
    const hasAssistantReply = [...messages].reverse().some((m) => m.role === 'assistant');
    if (!hasAssistantReply) return [];
    const asked = new Set(
      messages.filter((m) => m.role === 'user').map((m) => m.content.trim().toLowerCase()),
    );
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const tokens = new Set(
      (lastUser?.content.toLowerCase().match(/[a-z]+/g) ?? []).filter((t) => t.length > 3),
    );
    return promptPool
      .filter((p) => !asked.has(p.trim().toLowerCase()))
      .map((p) => {
        const words = p.toLowerCase().match(/[a-z]+/g) ?? [];
        const overlap = words.filter((w) => tokens.has(w)).length;
        return { p, score: overlap + (currentModulePrompts.has(p) ? 2 : 0) };
      })
      .sort((a, b) => b.score - a.score || promptPool.indexOf(a.p) - promptPool.indexOf(b.p))
      .slice(0, 3)
      .map((s) => s.p);
  }, [messages, chat.isPending, promptPool, currentModulePrompts]);

  /** A cancelled send is intentional - stay silent so the user can just send another. */
  function ignoreCancel(err: unknown): boolean {
    const cause = (err as Error | null)?.cause;
    return axios.isAxiosError(cause) && cause.code === 'ERR_CANCELED';
  }

  // Sessions persist per signed-in user on the server; guests stay ephemeral
  // in memory only and never touch the session endpoints.
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { data: sessions = [], isLoading: sessionsLoading } = useChatSessions(isAuthenticated);
  const renameSession = useRenameChatSession();
  const deleteSession = useDeleteChatSession();
  const [view, setView] = useState<'chat' | 'sessions'>('chat');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [openingSession, setOpeningSession] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  function adoptSession(session: { id: number; title: string } | null) {
    if (!session) return;
    setActiveSessionId(session.id);
    void queryClient.invalidateQueries({ queryKey: assistantSessionKeys.list() });
  }

  function newChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setDraft('');
    setView('chat');
  }

  async function openSession(id: number) {
    setOpeningSession(true);
    try {
      const { data } = await axiosInstance.get<{ data: ChatSessionDetail }>(`/assistant/sessions/${id}`);
      setActiveSessionId(data.data.id);
      setMessages(data.data.messages ?? []);
      setError(null);
      setView('chat');
    } catch (err) {
      setError(sanitizeErrorMessage(err, 'Could not open that chat'));
    } finally {
      setOpeningSession(false);
    }
  }

  async function removeSession(id: number, title: string) {
    const ok = await confirm({
      title: 'Delete this chat?',
      message: `"${title}" and its messages will be permanently removed.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    deleteSession.mutate(id, {
      onSuccess: () => {
        if (activeSessionId === id) {
          newChat();
        }
      },
    });
  }

  function submitRename(id: number) {
    renameSession.mutate(
      { id, title: renameTitle.trim() },
      { onSuccess: () => setRenamingId(null) },
    );
  }

  function send(content: string): boolean {
    const text = content.trim();
    if (!text || chat.isPending) return false;
    const next: AssistantMessage[] = [...messages, { role: 'user' as const, content: text }].slice(-20);
    setMessages(next);
    setDraft('');
    setError(null);
    chat.mutate(
      { messages: next, sessionId: isAuthenticated ? activeSessionId : undefined },
      {
        onSuccess: (result) => {
          setMessages((prev) => [...prev, { role: 'assistant' as const, content: result.reply }].slice(-20));
          adoptSession(result.session);
        },
        onError: (err) => {
          if (!ignoreCancel(err)) setError(err.message);
        },
      },
    );
    return true;
  }

  function resendLast() {
    if (chat.isPending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setError(null);
    chat.mutate(
      { messages, sessionId: isAuthenticated ? activeSessionId : undefined },
      {
        onSuccess: (result) => {
          setMessages((prev) => [...prev, { role: 'assistant' as const, content: result.reply }].slice(-20));
          adoptSession(result.session);
        },
        onError: (err) => {
          if (!ignoreCancel(err)) setError(err.message);
        },
      },
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (send(draft)) {
      requestAnimationFrame(() => {
        if (composerRef.current) composerRef.current.style.height = 'auto';
      });
    }
  }

  function growComposer(target: HTMLTextAreaElement) {
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Chat with Custosell AI Agent'}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-[9000] flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-all active:scale-95 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700">
            <X className="h-5 w-5" aria-hidden />
          </span>
        ) : (
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700">
            <Bot className="h-6 w-6" aria-hidden />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full ring-2 ring-white">
              <img src={oscarAvatar} alt="" aria-hidden className="h-full w-full object-cover" />
            </span>
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Chat with Custosell AI Agent"
          className="fixed right-0 top-0 z-[9000] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white sm:w-[420px] sm:border-l sm:border-gray-200"
        >
          <header className="flex shrink-0 items-center gap-2.5 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
            <AssistantLockup size="md" />
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
                Custosell AI Agent
                <AiBadge />
              </h2>
              <p className="truncate text-[11px] text-gray-500">
                I am Oscar, ask me about Custosell.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView(view === 'sessions' ? 'chat' : 'sessions')}
              aria-label={view === 'sessions' ? 'Back to chat' : 'Past chats'}
              title={view === 'sessions' ? 'Back to chat' : 'Past chats'}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <History className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={newChat}
              aria-label="New chat"
              title="New chat"
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <SquarePen className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide assistant"
              title="Hide assistant"
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4 lg:hidden" aria-hidden />
              <ChevronsRight className="hidden h-4 w-4 lg:block" aria-hidden />
            </button>
          </header>

          {view === 'sessions' ? (
            <AssistantSessionsPanel
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              activeSessionId={activeSessionId}
              openingSession={openingSession}
              renamingId={renamingId}
              renameTitle={renameTitle}
              renamePending={renameSession.isPending}
              onBack={() => setView('chat')}
              onNew={newChat}
              onOpen={(id) => void openSession(id)}
              onRemove={(id, title) => void removeSession(id, title)}
              onStartRename={(id, title) => {
                setRenamingId(id);
                setRenameTitle(title);
              }}
              onRenameTitleChange={setRenameTitle}
              onSubmitRename={submitRename}
              onCancelRename={() => setRenamingId(null)}
            />
          ) : (
            <AssistantThread
              messages={messages}
              prompts={prompts}
              intro={copy.intro}
              greetingName={greetingName || null}
              isPending={chat.isPending}
              error={error}
              listRef={listRef}
              onSend={send}
              onRetry={resendLast}
            />
          )}

          <AssistantComposer
            followUps={followUps}
            error={error}
            draft={draft}
            placeholder={placeholder}
            isPending={chat.isPending}
            composerRef={composerRef}
            onDraftChange={(value, target) => {
              setDraft(value);
              growComposer(target);
            }}
            onSubmit={onSubmit}
            onStop={() => abortAssistantChat()}
            onFollowUp={send}
            onHide={() => setOpen(false)}
          />
        </section>
      )}
    </>,
    document.body,
  );
}

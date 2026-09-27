import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { AssistantFab } from './AssistantFab';
import {
  APPS_ACCESS_PROMPT,
  APPS_SETUP_PROMPT,
  PLACEHOLDER_BY_SLUG,
  SEGMENT_COPY,
  VIEW_CONTEXTS,
  groupPromptsFor,
  type AssistantSegment,
} from './assistantContent';
import { useAssistantSend } from './useAssistantSend';
import { AssistantHeader } from './AssistantHeader';
import {
  clearActiveSessionId,
  saveActiveSessionId,
  useAssistantThreadRestore,
} from './assistantThreadStore';
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
    const pool = groupLabels.flatMap((label) => groupPromptsFor(label, segment));
    for (const fallback of copy.prompts) {
      if (!pool.includes(fallback)) pool.push(fallback);
    }
    return pool;
  }, [groupLabels, copy, segment]);
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
    return new Set(labels.flatMap((label) => groupPromptsFor(label, segment)));
  }, [groupLabels, currentSlug, viewContext, segment]);
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
  const [expanded, setExpanded] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [openingSession, setOpeningSession] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Thread continuity: members resume their server-side session id,
  // guests keep their thread in this browser only (never on the server).
  // The server also merges stored turns into the model context, so
  // follow-ups keep working even when the client sends the latest turn.
  function adoptSession(session: { id: number; title: string } | null) {
    if (!session) return;
    setActiveSessionId(session.id);
    const id = user?.id;
    if (id != null) {
      saveActiveSessionId(id, session.id);
    }
    void queryClient.invalidateQueries({ queryKey: assistantSessionKeys.list() });
  }

  function newChat() {
    setActiveSessionId(null);
    setEditingIndex(null);
    const id = user?.id;
    if (id != null) {
      clearActiveSessionId(id);
    }
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

  useAssistantThreadRestore({
    isAuthenticated,
    userId: user?.id ?? null,
    messages,
    setMessages,
    setError,
    setView,
    setActiveSessionId,
  });

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

  // Turn counter shared with the send hook: stopping bumps it so a late
  // provider response can never resurrect a killed turn.
  const generationRef = useRef(0);

  const { send, submitMessages, resendLast, regenerate } = useAssistantSend({
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
  });

  /** Stop kills the request, drops pending UI instantly, and voids late arrivals. */
  function stopGenerating() {
    abortAssistantChat();
    generationRef.current += 1;
    chat.reset();
  }

  // Editing a sent message branches the thread: submit drops everything
  // from the edited message on and resends, like popular AI tools.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function startEdit(index: number) {
    const target = messages[index];
    if (!target || target.role !== 'user' || chat.isPending) return;
    setEditingIndex(index);
    setDraft(target.content);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      if (composerRef.current) growComposer(composerRef.current);
    });
  }

  function cancelEdit() {
    setEditingIndex(null);
    setDraft('');
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingIndex !== null) {
      if (submitMessages(messages.slice(0, editingIndex), draft)) {
        setEditingIndex(null);
        resetComposerHeight();
      }
      return;
    }
    if (send(draft)) {
      resetComposerHeight();
    }
  }

  function resetComposerHeight() {
    requestAnimationFrame(() => {
      if (composerRef.current) composerRef.current.style.height = 'auto';
    });
  }

  function growComposer(target: HTMLTextAreaElement) {
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  }

  function sessionPanelNode(hideHeader = false) {
    return (
      <AssistantSessionsPanel
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        activeSessionId={activeSessionId}
        openingSession={openingSession}
        renamingId={renamingId}
        renameTitle={renameTitle}
        renamePending={renameSession.isPending}
        hideHeader={hideHeader}
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
    );
  }

  const sessionPanel = sessionPanelNode();
  const sessionSidebar = sessionPanelNode(true);

  // Two prompts never rotate away for signed-in users: workspace setup
  // and access troubleshooting.
  const displayPrompts = useMemo(() => {
    if (!isAuthenticated) return prompts;
    const shown = [...prompts];
    for (const fixed of [APPS_SETUP_PROMPT, APPS_ACCESS_PROMPT]) {
      if (!shown.includes(fixed)) shown.push(fixed);
    }
    return shown;
  }, [isAuthenticated, prompts]);

  // Dismissed suggestions stay hidden only for the current turn count -
  // the next exchange brings fresh ones back.
  const [suggestionsHiddenFor, setSuggestionsHiddenFor] = useState<number | null>(null);
  const dismissSuggestions = () => setSuggestionsHiddenFor(messages.length);
  const shownPrompts = suggestionsHiddenFor === messages.length ? [] : displayPrompts;
  const shownFollowUps = suggestionsHiddenFor === messages.length ? [] : followUps;

  const thread = (
    <AssistantThread
      messages={messages}
      prompts={shownPrompts}
      intro={copy.intro}
      greetingName={greetingName || null}
      senderName={isAuthenticated && user?.name ? user.name : 'Guest User'}
      senderAvatar={user?.avatar ?? null}
      showTutorials={isAuthenticated}
      isPending={chat.isPending}
      error={error}
      listRef={listRef}
      onSend={send}
      onRetry={resendLast}
      onEditMessage={startEdit}
      onRegenerate={() => {
        setEditingIndex(null);
        regenerate();
      }}
      canInteract={!chat.isPending}
      onDismissPrompts={dismissSuggestions}
    />
  );

  const composer = (
    <AssistantComposer
      followUps={shownFollowUps}
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
            onStop={stopGenerating}
      onFollowUp={send}
      onHide={() => setOpen(false)}
      editing={editingIndex !== null}
      onCancelEdit={cancelEdit}
      onDismissFollowUps={dismissSuggestions}
    />
  );

  return createPortal(
    <>
      <AssistantFab open={open} onToggle={() => setOpen((v) => !v)} />

      {open && (
        <section
          aria-label="Chat with Custosell AI Agent"
          className={
            expanded
              ? 'fixed inset-0 z-[9000] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white'
              : 'fixed right-0 top-0 z-[9000] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white md:w-[360px] lg:w-[380px] xl:w-[420px] md:border-l md:border-gray-200'
          }
        >
          <AssistantHeader
            view={view}
            expanded={expanded}
            onToggleView={() => setView(view === 'sessions' ? 'chat' : 'sessions')}
            onNew={newChat}
            onToggleExpand={() => setExpanded((v) => !v)}
            onClose={() => setOpen(false)}
          />

          {expanded ? (
            <div className="flex min-h-0 flex-1">
              <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50 sm:flex lg:w-72">
                {sessionSidebar}
              </aside>
              <div className="flex min-h-0 flex-1 flex-col sm:hidden">
                {view === 'sessions' ? (
                  sessionPanel
                ) : (
                  <>
                    {thread}
                    {composer}
                  </>
                )}
              </div>
              <div className="hidden min-h-0 flex-1 flex-col sm:flex">
                {thread}
                {composer}
              </div>
            </div>
          ) : (
            <>
              {view === 'sessions' ? (
                sessionPanel
              ) : (
                <>
                  {thread}
                  {composer}
                </>
              )}
            </>
          )}
        </section>
      )}
    </>,
    document.body,
  );
}

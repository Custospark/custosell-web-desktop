import { useState } from 'react';
import { Pencil, Search, SquarePen, Trash2, X } from 'lucide-react';
import type { ChatSession } from '../../api/assistant/AssistantQueries';

interface AssistantSessionsPanelProps {
  sessions: ChatSession[];
  sessionsLoading: boolean;
  activeSessionId: number | null;
  openingSession: boolean;
  renamingId: number | null;
  renameTitle: string;
  renamePending: boolean;
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: number) => void;
  onRemove: (id: number, title: string) => void;
  onStartRename: (id: number, title: string) => void;
  onRenameTitleChange: (value: string) => void;
  onSubmitRename: (id: number) => void;
  onCancelRename: () => void;
  /** Embedded sidebar mode: hides the top bar (the main header owns it). */
  hideHeader?: boolean;
}

export function AssistantSessionsPanel({
  sessions,
  sessionsLoading,
  activeSessionId,
  openingSession,
  renamingId,
  renameTitle,
  renamePending,
  onBack,
  onNew,
  onOpen,
  onRemove,
  onStartRename,
  onRenameTitleChange,
  onSubmitRename,
  onCancelRename,
  hideHeader,
}: AssistantSessionsPanelProps) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visibleSessions =
    needle === '' ? sessions : sessions.filter((s) => s.title.toLowerCase().includes(needle));
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      {!hideHeader && (
      <div className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          ← Back
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">Past chats</p>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <SquarePen className="h-3.5 w-3.5" aria-hidden />
          New
        </button>
      </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        {sessionsLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading chats…</p>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No saved chats yet - your conversations appear here.
          </p>
        ) : (
          <>
            <div className="sticky top-0 bg-gray-50 pb-2 pt-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  aria-label="Search chats"
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            {visibleSessions.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No chats match your search.
              </p>
            ) : (
          <ul className="space-y-1.5">
            {visibleSessions.map((session) => (
              <li
                key={session.id}
                className={`rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-colors ${
                  session.id === activeSessionId
                    ? 'border-blue-300 ring-1 ring-blue-200/60'
                    : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                {renamingId === session.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (renameTitle.trim()) {
                        onSubmitRename(session.id);
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      autoFocus
                      value={renameTitle}
                      onChange={(e) => onRenameTitleChange(e.target.value)}
                      maxLength={120}
                      aria-label="Chat title"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    />
                    <button
                      type="submit"
                      disabled={renamePending}
                      className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={onCancelRename}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpen(session.id)}
                      disabled={openingSession}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {session.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-500">
                        {session.messages_count ?? 0} messages
                        {session.updated_at
                          ? ` · ${new Date(session.updated_at).toLocaleDateString()}`
                          : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${session.title}`}
                      onClick={() => onStartRename(session.id, session.title)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${session.title}`}
                      onClick={() => onRemove(session.id, session.title)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import type { RefObject } from 'react';
import { ChevronRight, Send, Square, X } from 'lucide-react';

interface AssistantComposerProps {
  followUps: string[];
  error: string | null;
  draft: string;
  placeholder: string;
  isPending: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string, target: HTMLTextAreaElement) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  onFollowUp: (prompt: string) => void;
  onHide: () => void;
  /** True while editing a sent message - submit resends the branch. */
  editing: boolean;
  onCancelEdit: () => void;
}

export function AssistantComposer({
  followUps,
  error,
  draft,
  placeholder,
  isPending,
  composerRef,
  onDraftChange,
  onSubmit,
  onStop,
  onFollowUp,
  onHide,
  editing,
  onCancelEdit,
}: AssistantComposerProps) {
  return (
    <>
      {followUps.length > 0 && !error && (
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 border-t border-gray-100 bg-white px-3 py-2">
          {followUps.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onFollowUp(prompt)}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100"
            >
              <span>{prompt}</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="shrink-0 border-t border-gray-200 bg-white px-3 py-2.5">
        {editing && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
            <span>Editing message - submit to resend this branch</span>
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel editing"
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-indigo-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={composerRef}
            rows={2}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value, e.target)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
            } else if (e.key === 'Escape') {
              if (editing) {
                onCancelEdit();
              } else {
                onHide();
              }
            }
            }}
            placeholder={placeholder}
            aria-label="Ask Custosell AI Agent"
            maxLength={2000}
            className="max-h-32 min-h-[4.5rem] w-full resize-none overflow-y-auto rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 pr-11 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          />
          {isPending ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-900"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              title="Send message"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </form>
      <p className="shrink-0 border-t border-gray-100 bg-white px-3 py-1.5 text-center text-[10px] text-gray-400">
        AI agent - verify important figures before acting on them.
      </p>
    </>
  );
}

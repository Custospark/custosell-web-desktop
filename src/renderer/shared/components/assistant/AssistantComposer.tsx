import type { RefObject } from 'react';
import { Send, Square } from 'lucide-react';

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
}: AssistantComposerProps) {
  return (
    <>
      {followUps.length > 0 && !error && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-gray-100 bg-white px-3 py-2">
          {followUps.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onFollowUp(prompt)}
              className="shrink-0 whitespace-nowrap rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
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
              onHide();
            }
          }}
          placeholder={placeholder}
          aria-label="Ask Custosell AI Agent"
          maxLength={2000}
          className="max-h-32 min-h-[4.5rem] min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
        />
        {isPending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg bg-gray-800 text-white transition-colors hover:bg-gray-900"
          >
            <Square className="h-4 w-4 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>
      <p className="shrink-0 border-t border-gray-100 bg-white px-3 py-1.5 text-center text-[10px] text-gray-400">
        AI agent - verify important figures before acting on them.
      </p>
    </>
  );
}

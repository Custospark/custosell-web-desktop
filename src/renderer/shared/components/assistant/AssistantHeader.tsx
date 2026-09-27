import { History, Maximize2, Minimize2, SquarePen, X } from 'lucide-react';
import { AiBadge, AssistantLockup } from './AssistantBrand';

interface AssistantHeaderProps {
  view: 'chat' | 'sessions';
  expanded: boolean;
  onToggleView: () => void;
  onNew: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function AssistantHeader({
  view,
  expanded,
  onToggleView,
  onNew,
  onToggleExpand,
  onClose,
}: AssistantHeaderProps) {
  const iconBtn = expanded
    ? 'rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
    : 'rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600';
  const hideBtn = expanded
    ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700'
    : 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700';

  return (
    <header
      className={
        expanded
          ? 'flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-5 py-4 sm:gap-4 sm:px-8 sm:py-5'
          : 'flex shrink-0 items-center gap-2.5 border-b border-gray-200 bg-white px-5 py-4 sm:px-6'
      }
    >
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
        onClick={onToggleView}
        aria-label={view === 'sessions' ? 'Back to chat' : 'Past chats'}
        title={view === 'sessions' ? 'Back to chat' : 'Past chats'}
        className={iconBtn}
      >
        <History className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNew}
        aria-label="New chat"
        title="New chat"
        className={iconBtn}
      >
        <SquarePen className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={expanded ? 'Exit full screen' : 'Full screen'}
        title={expanded ? 'Exit full screen' : 'Full screen'}
        className={iconBtn}
      >
        {expanded ? (
          <Minimize2 className="h-4 w-4" aria-hidden />
        ) : (
          <Maximize2 className="h-4 w-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Hide assistant"
        title="Hide assistant"
        className={hideBtn}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Hide
      </button>
    </header>
  );
}

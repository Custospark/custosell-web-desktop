import { ArrowLeftRight, Plus } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface BoardSwitcherIconsProps {
  onOpenAll: () => void;
  onCreateNew: () => void;
  allowCreate?: boolean;
  className?: string;
}

export default function BoardSwitcherIcons({
  onOpenAll,
  onCreateNew,
  allowCreate = true,
  className,
}: BoardSwitcherIconsProps) {
  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-center gap-3 border-t border-white/40 bg-white/85 px-3 py-2.5 backdrop-blur-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenAll}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border-2 border-indigo-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
          'bg-gradient-to-r from-indigo-50 via-white to-blue-50 text-indigo-800',
          'hover:border-indigo-400 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md hover:shadow-indigo-200/50',
          'active:scale-[0.98]',
        )}
        title="Switch boards"
        aria-label="Switch boards"
      >
        <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
        <span className="hidden sm:inline">Switch boards</span>
      </button>
      {allowCreate && (
        <button
          type="button"
          onClick={onCreateNew}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-violet-400/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
            'bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 text-violet-800',
            'hover:border-violet-500 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md hover:shadow-violet-200/50',
            'active:scale-[0.98]',
          )}
          title="New Board"
          aria-label="New Board"
        >
          <Plus className="h-4 w-4 text-violet-600" />
          <span className="hidden sm:inline">New Board</span>
        </button>
      )}
    </div>
  );
}

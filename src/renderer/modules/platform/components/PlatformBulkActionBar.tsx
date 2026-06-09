import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface PlatformBulkActionBarProps {
  count: number;
  onClearSelection?: () => void;
  children: ReactNode;
  className?: string;
}

export function PlatformBulkActionBar({
  count,
  onClearSelection,
  children,
  className,
}: PlatformBulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/95 px-4 py-3 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">
          {count}
        </span>
        <span className="text-sm font-medium text-indigo-950">
          {count === 1 ? '1 item selected' : `${count} items selected`}
        </span>
        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

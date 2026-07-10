import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export interface ExplorerMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ExplorerRowMenuProps {
  items: ExplorerMenuItem[];
  className?: string;
  /** Keep the ⋯ button visible (e.g. when the row is selected). */
  pinnedVisible?: boolean;
}

export function ExplorerRowMenu({ items, className, pinnedVisible = false }: ExplorerRowMenuProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const showButton = pinnedVisible || open;

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-all',
          showButton
            ? 'opacity-100 bg-white/80 text-gray-800 shadow-sm ring-1 ring-gray-200/80'
            : 'opacity-0 hover:bg-white/80 hover:text-gray-900 group-hover:opacity-100 group-focus-within:opacity-100',
          open && 'bg-white text-gray-900 ring-indigo-200',
        )}
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-40 mt-0.5 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
                  item.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
}

export function ExplorerRowMenu({ items, className }: ExplorerRowMenuProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-opacity',
          'opacity-0 hover:bg-gray-200/90 hover:text-gray-900 group-hover:opacity-100 group-focus-within:opacity-100',
          open && 'opacity-100 bg-gray-200/90 text-gray-900',
        )}
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
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

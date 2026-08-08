import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface RowActionItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** Renders a separator line before this item. */
  dividerBefore?: boolean;
  /** Danger tones the label/icon red (e.g. delete). */
  danger?: boolean;
}

interface RowActionsMenuProps {
  items: RowActionItem[];
  ariaLabel: string;
  /** Prevents opening the menu when true. */
  disabled?: boolean;
  menuClassName?: string;
}

export const ROW_MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function RowActionsMenu({ items, ariaLabel, disabled, menuClassName }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ right: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const correctedRef = useRef(false);

  const handleClose = useCallback(() => {
    setOpen(false);
    setOrigin(null);
    correctedRef.current = false;
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      if (!prev) {
        correctedRef.current = false;
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) {
          setOrigin({ right: window.innerWidth - rect.right, top: rect.bottom + 4 });
        }
      }
      return !prev;
    });
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open || correctedRef.current) return;
    const el = menuRef.current;
    const btn = btnRef.current;
    if (!el || !btn) return;
    const btnRect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom - 4;
    if (spaceBelow < el.offsetHeight) {
      const top = Math.max(8, btnRect.top - el.offsetHeight - 4);
      queueMicrotask(() => setOrigin((prev) => (prev ? { ...prev, top } : prev)));
    }
    correctedRef.current = true;
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Actions"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close menu"
            onClick={handleClose}
          />
          {origin && (
            <div
              ref={menuRef}
              role="menu"
              className={cn(
                'fixed z-40 mt-0.5 max-h-[calc(100vh-1rem)] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg',
                menuClassName,
              )}
              style={{ right: origin.right, top: origin.top }}
            >
              {items.map((item) => (
                <div key={item.key}>
                  {item.dividerBefore && <div className="my-1 border-t border-gray-100" />}
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(ROW_MENU_ITEM_CLASS, item.danger && 'text-red-600')}
                    onClick={() => {
                      handleClose();
                      item.onClick();
                    }}
                    disabled={item.disabled}
                    title={item.title}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { MODAL_NESTED_PORTAL_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';

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
  pinnedVisible?: boolean;
}

const MENU_PORTAL_Z_CLASS = MODAL_NESTED_PORTAL_Z_INDEX_CLASS;

export function ExplorerRowMenu({ items, className, pinnedVisible = false }: ExplorerRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState<{ right: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const correctedRef = useRef(false);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => {
      if (!prev) {
        correctedRef.current = false;
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) {
          setMenuOrigin({ right: window.innerWidth - rect.right, top: rect.bottom + 4 });
        }
      }
      return !prev;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMenuOrigin(null);
    correctedRef.current = false;
  }, []);

  useLayoutEffect(() => {
    if (!open || correctedRef.current) return;
    const el = menuRef.current;
    const btn = btnRef.current;
    if (!el || !btn) return;
    const btnRect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom - 4;
    if (spaceBelow < el.offsetHeight) {
      const top = Math.max(8, btnRect.top - el.offsetHeight - 4);
      queueMicrotask(() => setMenuOrigin((prev) => (prev ? { ...prev, top } : prev)));
    }
    correctedRef.current = true;
  }, [open]);

  if (items.length === 0) return null;

  const showButton = pinnedVisible || open;

  return (
    <>
      <div className={cn('relative shrink-0', className)}>
        <button
          ref={btnRef}
          type="button"
          onClick={handleToggle}
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
      </div>
      {open && typeof document !== 'undefined' && menuOrigin && createPortal(
        <>
          <button
            type="button"
            className={`fixed inset-0 ${MENU_PORTAL_Z_CLASS} cursor-default`}
            aria-label="Close menu"
            onClick={handleClose}
          />
          <div
            ref={menuRef}
            role="menu"
            className={`fixed ${MENU_PORTAL_Z_CLASS} mt-0.5 max-h-[calc(100vh-1rem)] min-w-[11rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-2xl ring-1 ring-black/5`}
            style={{ right: menuOrigin.right, top: menuOrigin.top }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
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
        </>,
        document.body,
      )}
    </>
  );
}

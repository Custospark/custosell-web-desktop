import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Mail, MoreVertical, RefreshCw, Shield, Trash2, Zap } from 'lucide-react';
import type { PlatformBusiness } from '../api/PlatformTypes';

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

interface PlatformBusinessRowActionsProps {
  business: PlatformBusiness;
  onNotify: () => void;
  onChangeStatus: () => void;
  onActivateSubscription: () => void;
  onReset: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function PlatformBusinessRowActions({
  business,
  onNotify,
  onChangeStatus,
  onActivateSubscription,
  onReset,
  onDelete,
  disabled,
}: PlatformBusinessRowActionsProps) {
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
      queueMicrotask(() => setOrigin((prev) => (prev ? { ...prev, top } : prev)));
    }
    correctedRef.current = true;
  }, [open]);

  const hasSubscription = !!business.subscription_status;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Actions"
        aria-label="Business actions"
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
              className="fixed z-40 mt-0.5 max-h-[calc(100vh-1rem)] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              style={{ right: origin.right, top: origin.top }}
            >
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onNotify(); }}>
                <Mail className="h-4 w-4 text-gray-400" /> Send notification
              </button>
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onChangeStatus(); }}>
                <Shield className="h-4 w-4 text-blue-600" /> Change status
              </button>
              {!hasSubscription && (
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onActivateSubscription(); }}>
                  <Zap className="h-4 w-4 text-emerald-600" /> Activate subscription
                </button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onReset(); }}>
                <RefreshCw className="h-4 w-4 text-amber-500" /> Wipe data
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onDelete(); }}>
                <Trash2 className="h-4 w-4 text-red-500" /> Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

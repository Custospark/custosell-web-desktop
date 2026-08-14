import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CONFIRM_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { StorefrontAuthPanel } from './StorefrontAuthPanel';

interface StorefrontLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  /** Cart place-order flow - CTA says create/sign-in & place order. */
  placeOrderMode?: boolean;
}

/**
 * Discover account dialog - create account (default) or sign in.
 * No dimmed/blurred backdrop so browse + cart stay visible (not “blocked”).
 */
export function StorefrontLoginDialog({
  isOpen,
  onClose,
  onSuccess,
  title = 'Create an account to continue',
  subtitle = 'Shop as a customer - no business setup. Carts stay in this browser.',
  placeOrderMode = false,
}: StorefrontLoginDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined' || !isOpen) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-4 pointer-events-none',
        CONFIRM_Z_INDEX_CLASS,
      )}
    >
      {/* Transparent hit area only - no dim / blur */}
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 cursor-default bg-transparent"
        aria-label="Close account dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="storefront-login-title"
        className="pointer-events-auto relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ring-1 ring-slate-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="storefront-login-title" className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <StorefrontAuthPanel
          onSuccess={onSuccess}
          defaultMode="create"
          placeOrderMode={placeOrderMode}
        />
      </div>
    </div>,
    document.body,
  );
}

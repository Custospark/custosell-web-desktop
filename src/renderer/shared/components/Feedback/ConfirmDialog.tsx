import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Trash, X } from 'lucide-react';
import { Button } from '../buttons/Button';
import { CONFIRM_Z_INDEX_CLASS } from '../modals/Modal';
import type { ConfirmOptions, ConfirmVariant } from './ConfirmContext';

interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ElementType; iconColor: string; confirmBg: string; iconBg: string }> = {
  danger: { icon: Trash, iconColor: 'text-red-500', confirmBg: 'bg-red-600 hover:bg-red-700', iconBg: 'bg-red-50' },
  warning: { icon: AlertTriangle, iconColor: 'text-amber-500', confirmBg: 'bg-amber-600 hover:bg-amber-700', iconBg: 'bg-amber-50' },
  info: { icon: Info, iconColor: 'text-blue-500', confirmBg: 'bg-blue-600 hover:bg-blue-700', iconBg: 'bg-blue-50' },
};

export function ConfirmDialog({ open, options, onConfirm, onCancel }: ConfirmDialogProps) {
  const [countdown, setCountdown] = useState(options?.countdownSec ?? 0);

  useEffect(() => {
    if (!open || !options?.countdownSec) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [open, options?.countdownSec]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  if (!options || typeof document === 'undefined') return null;

  const config = variantConfig[options.variant || 'info'];
  const Icon = config.icon;
  const isDisabled = options.countdownSec ? countdown > 0 : false;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 ${CONFIRM_Z_INDEX_CLASS} flex items-center justify-center p-4 pointer-events-none`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative pointer-events-auto w-full max-w-md rounded-xl bg-white p-6 opacity-100 shadow-2xl ring-1 ring-black/10"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-2.5 ${config.iconBg}`}>
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
              </div>
              <div className="flex-1 pr-6">
                <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
                  {options.title}
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-500">{options.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={onCancel}>{options.cancelText || 'Cancel'}</Button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDisabled}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${config.confirmBg}`}
              >
                {options.confirmText || 'Confirm'}
                {isDisabled && ` (${countdown}s)`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

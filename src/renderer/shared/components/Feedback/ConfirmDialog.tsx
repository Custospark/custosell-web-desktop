import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Trash, X } from 'lucide-react';
import { Button } from '../buttons/Button';
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
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (options?.countdownSec) {
      setCountdown(options.countdownSec);
      const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [options?.countdownSec, open]);

  if (!options) return null;

  const config = variantConfig[options.variant || 'info'];
  const Icon = config.icon;
  const isDisabled = options.countdownSec ? countdown > 0 : false;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50" onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
          >
            <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-full ${config.iconBg}`}>
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{options.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{options.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={onCancel}>{options.cancelText || 'Cancel'}</Button>
              <button
                onClick={onConfirm}
                disabled={isDisabled}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${config.confirmBg}`}
              >
                {options.confirmText || 'Confirm'}
                {isDisabled && ` (${countdown}s)`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

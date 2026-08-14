import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Above cart sheets, strips, and nav menus. */
export const MODAL_Z_INDEX_CLASS = 'z-[20000]';

/**
 * Portaled menus/selects opened from inside a modal - above the modal panel,
 * below confirm dialogs.
 */
export const MODAL_NESTED_PORTAL_Z_INDEX_CLASS = 'z-[20500]';

/** Confirm dialogs must sit above modals and drawers. */
export const CONFIRM_Z_INDEX_CLASS = 'z-[21000]';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bodyClassName?: string;
  panelClassName?: string;
  titleCentered?: boolean;
  /** Hide the X control (e.g. required onboarding). */
  hideCloseButton?: boolean;
  /** When false, Escape does not call onClose. Default true. */
  closeOnEscape?: boolean;
  /** @deprecated Color pickers and menus use portals; body always scrolls. */
  overflowVisible?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  bodyClassName,
  panelClassName,
  titleCentered = false,
  hideCloseButton = false,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} flex items-center justify-center p-4 pointer-events-none`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'relative pointer-events-auto flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white opacity-100 shadow-2xl ring-1 ring-black/10',
              sizeClasses[size],
              panelClassName,
            )}
          >
            {title ? (
              <div
                className={cn(
                  'relative flex shrink-0 border-b border-gray-200 px-6 py-4',
                  titleCentered ? 'flex-col items-center text-center' : 'items-start justify-between',
                )}
              >
                <div className={cn('min-w-0', titleCentered ? 'px-8' : 'pr-4')}>
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                  {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
                </div>
                {!hideCloseButton ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'shrink-0 text-slate-500 transition-colors hover:text-slate-800',
                      titleCentered ? 'absolute right-4 top-4' : '',
                    )}
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            ) : (
              !hideCloseButton ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 z-10 text-slate-500 transition-colors hover:text-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null
            )}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName ?? 'px-6 py-4')}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

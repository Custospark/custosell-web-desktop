import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import {
  SIDEBAR_WIDTH_COLLAPSED_CLASS,
  SIDEBAR_WIDTH_EXPANDED_CLASS,
} from '../layout/layoutConstants';

interface SlideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  width?: string;
  /** Span main content area only - leave the sidebar visible on large screens. */
  fullContentWidth?: boolean;
  /** Hide Save/Cancel footer (e.g. read-only or auto-save drawers). */
  hideFooter?: boolean;
  hideKeyboardTip?: boolean;
}

export function SlideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  isSubmitting,
  canSubmit,
  width = 'sm:w-[560px]',
  fullContentWidth = false,
  hideFooter = false,
  hideKeyboardTip = false,
}: SlideDrawerProps) {
  const { state } = useAppContext();
  const sidebarOffsetClass = state.sidebarCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED_CLASS
    : SIDEBAR_WIDTH_EXPANDED_CLASS;
  const insetClass = fullContentWidth
    ? `inset-0 ${sidebarOffsetClass}`
    : 'inset-0';
  const panelWidthClass = fullContentWidth
    ? `left-0 right-0 ${sidebarOffsetClass}`
    : `w-full ${width}`;
  const nameRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (open) {
      didAutoFocus.current = false;
      requestAnimationFrame(() => {
        if (nameRef.current && !didAutoFocus.current) {
          nameRef.current.focus();
          didAutoFocus.current = true;
        }
      });
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit && canSubmit !== false && !isSubmitting) onSubmit();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`fixed ${insetClass} bg-black/50 cursor-default`}
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={`absolute right-0 top-0 h-full ${panelWidthClass} bg-white shadow-xl flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 shrink-0">
          <div className="min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            {!hideKeyboardTip && onSubmit && (
              <p className="text-xs text-gray-400 mt-1">
                Tip: Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onSubmit && canSubmit !== false && !isSubmitting) onSubmit();
            }}
          >
            {children}
          </form>
        </div>

        {/* Footer */}
        {!hideFooter && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            onClick={onSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
            ) : 'Save'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

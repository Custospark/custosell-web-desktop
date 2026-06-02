import { createContext, useContext } from 'react';
import type { ToastPosition } from '../../shared/components/Feedback/Toast';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type { ToastPosition };

interface ToastContextType {
  showToast: (variant: ToastVariant, message: string, duration?: number, position?: ToastPosition) => void;
  hideToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

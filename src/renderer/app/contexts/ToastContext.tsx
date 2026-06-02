import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { ToastManager, type ToastPosition } from '../../shared/components/Feedback/Toast';
import { ToastContext, type ToastVariant } from './useToast';
import { imperativeToast } from './imperativeToast';

interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
  position: ToastPosition;
}

const DEFAULT_POSITION: ToastPosition = 'top-right';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (variant: ToastVariant, message: string, duration = 5000, position: ToastPosition = DEFAULT_POSITION) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, variant, message, duration, position }]);
      if (duration > 0) {
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
      }
    },
    [],
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    imperativeToast.register(showToast);
    return () => imperativeToast.unregister();
  }, [showToast]);

  const positions = useMemo(() => {
    const unique = new Set(toasts.map((t) => t.position));
    return Array.from(unique);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {positions.map((position) => {
        const positionToasts = toasts.filter((t) => t.position === position);
        return (
          <ToastManager
            key={position}
            position={position}
            zIndex={9999}
            toasts={positionToasts.map((t) => ({ id: t.id, variant: t.variant, message: t.message, duration: t.duration }))}
            onRemove={hideToast}
          />
        );
      })}
    </ToastContext.Provider>
  );
}

export { useToast } from './useToast';

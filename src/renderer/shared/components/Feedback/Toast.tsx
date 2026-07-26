import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';

interface ToastProps {
  variant: ToastVariant;
  message: string;
  duration?: number;
  onClose: () => void;
  className?: string;
  position?: ToastPosition;
}

const iconMap: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info,
};

const colorMap: Record<ToastVariant, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
};

const getAnimation = (position: ToastPosition) => {
  const isTop = position.startsWith('top');
  const isRight = position.includes('right');
  const x = isRight ? 50 : -50;
  const y = isTop ? -50 : 50;
  return { initial: { opacity: 0, x, y, scale: 0.95 }, animate: { opacity: 1, x: 0, y: 0, scale: 1 }, exit: { opacity: 0, x, y, scale: 0.95 } };
};

export function Toast({ variant, message, duration = 5000, onClose, className = '', position = 'top-right' }: ToastProps) {
  useEffect(() => {
    if (duration > 0) { const t = setTimeout(onClose, duration); return () => clearTimeout(t); }
  }, [duration, onClose]);

  const colors = colorMap[variant] ?? colorMap.info;
  const Icon = iconMap[variant] ?? Info;
  const anim = getAnimation(position);

  return (
    <motion.div
      {...anim}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${colors.bg} ${colors.border} ${className} min-w-[320px] max-w-[480px]`}
      role="alert"
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <p className={`flex-1 text-sm font-medium ${colors.text}`}>{message}</p>
      <button onClick={onClose} className={`${colors.text} hover:opacity-70 flex-shrink-0`}><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

interface ToastManagerProps {
  position: ToastPosition;
  zIndex: number;
  toasts: Array<{ id: string; variant: ToastVariant; message: string; duration?: number }>;
  onRemove: (id: string) => void;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4', 'top-center': 'top-4 left-1/2 -translate-x-1/2', 'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4', 'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2', 'bottom-left': 'bottom-4 left-4',
};

export function ToastManager({ position, zIndex, toasts, onRemove }: ToastManagerProps) {
  return (
    <div className={`fixed ${positionClasses[position]} flex flex-col gap-2 pointer-events-none`} style={{ zIndex }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast variant={t.variant} message={t.message} duration={t.duration} onClose={() => onRemove(t.id)} position={position} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

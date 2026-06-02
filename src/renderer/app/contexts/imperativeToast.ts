import type { ToastPosition } from '../../shared/components/Feedback/Toast';
import type { ToastVariant } from './useToast';

type ShowToastFn = (variant: ToastVariant, message: string, duration?: number, position?: ToastPosition) => void;

let _handler: ShowToastFn | null = null;

export const imperativeToast = {
  register(fn: ShowToastFn): void { _handler = fn; },
  unregister(): void { _handler = null; },
  show(variant: ToastVariant, message: string, duration = 6000, position?: ToastPosition): void {
    if (_handler) {
      _handler(variant, message, duration, position);
    } else {
      console.warn(`[imperativeToast] No handler registered — toast dropped: [${variant}] ${message}`);
    }
  },
};

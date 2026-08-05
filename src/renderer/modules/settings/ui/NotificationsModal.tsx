import { Volume2 } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { useSoundPreferences } from '../../../app/sound/useSoundPreferences';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Buyer notifications settings as a standard modal — mirrors ProfileModal.
 * Lets an online-shopping account control the order-status sound on this device.
 */
export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const { orderSound, setOrderSound } = useSoundPreferences();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle="Choose what you hear when your orders change"
      size="sm"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Volume2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Order status sound</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-600">
              Play a chime when one of your orders moves to completed, invoiced, or cancelled.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={orderSound}
            onClick={() => setOrderSound(!orderSound)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              orderSound ? 'bg-indigo-600' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                orderSound ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { BellRing, Info } from 'lucide-react';
import { useWebPush } from '../hooks/useWebPush';
import { cn } from '../../../shared/utils/cn';

/**
 * "Desktop notifications" card for the Notifications inbox. Enables Web Push
 * so alerts arrive instantly (and while the app is closed), independent of the
 * in-app bell. Hidden entirely when the browser/Electron can't push.
 */
export function PushNotificationsCard() {
  const { supported, enabled, busy, error, permission, toggle } = useWebPush();

  if (!supported) return null;

  const permissionBlocked = permission === 'denied';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <BellRing className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Desktop notifications</p>
            <p className="mt-0.5 text-sm leading-snug text-gray-600">
              Get alerts instantly — even when the app is closed.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-busy={busy}
            disabled={busy || permissionBlocked}
            onClick={() => void toggle()}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
              enabled ? 'bg-blue-600' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        {(error || permissionBlocked) && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-xs leading-snug text-amber-800">
              {permissionBlocked
                ? 'Notifications are blocked for this site. Allow them in your browser settings, then flip the switch again.'
                : error}
            </p>
          </div>
        )}

        <p className="text-xs leading-snug text-gray-500 border-t border-gray-200 pt-3">
          Requires the app to be installed or the tab open once. New orders, sales, and account
          updates will appear as system notifications on this device.
        </p>
      </div>
    </div>
  );
}
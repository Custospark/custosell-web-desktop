import { Play, Volume2 } from 'lucide-react';
import { useSoundPreferences } from '../../../app/sound/useSoundPreferences';
import { playPreviewChime } from '../../../app/sound/orderChime';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';

/**
 * Business "Order sound" card shown at the top of the Notifications inbox.
 * Holds the master chime toggle, a "Play test sound" preview, and the optional
 * big-order threshold (clearing it upgrades the new-order chime + toast).
 */
export function OrderSoundCard() {
  const { orderSound, setOrderSound, bigOrderThreshold, setBigOrderThreshold } = useSoundPreferences();
  const currency = useAppSelector((s) => s.auth.user?.business?.currency) || 'UGX';

  const onThresholdBlur = (value: string) => {
    const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
    setBigOrderThreshold(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Volume2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Order sound</p>
            <p className="mt-0.5 text-sm leading-snug text-gray-600">
              Play a chime when a new open order arrives.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={orderSound}
            onClick={() => setOrderSound(!orderSound)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              orderSound ? 'bg-blue-600' : 'bg-gray-300',
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

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <label
              htmlFor="big-order-threshold"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Big-order alert ({currency})
            </label>
            <div className="mt-1.5 max-w-xs">
              <input
                id="big-order-threshold"
                type="text"
                inputMode="numeric"
                defaultValue={bigOrderThreshold != null ? String(bigOrderThreshold) : ''}
                onBlur={(e) => onThresholdBlur(e.target.value)}
                placeholder="Optional - e.g. 1000000"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <p className="mt-1.5 text-xs leading-snug text-gray-500">
              New open orders at or above{' '}
              {bigOrderThreshold != null ? formatCurrency(bigOrderThreshold, currency) : 'this amount'}{' '}
              play an urgent chime and a highlighted toast instead of the normal one.
            </p>
          </div>
          <button
            type="button"
            onClick={playPreviewChime}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Play className="h-4 w-4" aria-hidden />
            Play test sound
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { imperativeToast } from '../contexts/imperativeToast';
import { playBigOrderChime, playNewOrderChime, unlockAudio } from './orderChime';
import { loadSoundPreferences } from './soundPreferences';
import { formatCurrency } from '../../shared/utils/formatCurrency';

interface AlertableOrder {
  id: number;
  order_number: string;
  status: string;
  total_amount?: string | number;
}

function numeric(value: string | number | undefined): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Business-side alert - watches the polled open-orders list (the same one the
 * header Open Orders badge counts) and fires a double chime + toast whenever a
 * NEW open order appears. Because it runs from the header, it sounds no matter
 * which page the user is on.
 *
 * If a persisted big-order threshold is set and the newcomer's total clears it,
 * the urgent chime REPLACES the normal one and the toast is highlighted.
 *
 * Skips the first render (baseline), so only genuinely new arrivals alert.
 * Sound is OFF unless the persisted preference is enabled.
 */
export function useNewOrderChime(orders: AlertableOrder[]) {
  const baselineRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const prefs = loadSoundPreferences();
    if (prefs.orderSound) unlockAudio();

    const current = new Set(orders.filter((o) => o.status === 'open').map((o) => o.id));

    if (baselineRef.current === null) {
      baselineRef.current = current;
      return;
    }

    const previous = baselineRef.current;
    baselineRef.current = current;

    const newcomers = orders.filter((o) => o.status === 'open' && !previous.has(o.id));
    if (newcomers.length === 0) return;

    const threshold = prefs.bigOrderThreshold;
    const bigOrder = threshold != null ? newcomers.find((o) => numeric(o.total_amount) >= threshold) : undefined;

    if (prefs.orderSound) {
      if (bigOrder) playBigOrderChime();
      else playNewOrderChime();
    }

    if (bigOrder) {
      imperativeToast.show(
        'success',
        `Big order ${bigOrder.order_number} - ${formatCurrency(numeric(bigOrder.total_amount))} - tap to review`,
        8000,
      );
      return;
    }

    imperativeToast.show(
      'info',
      `${newcomers.length === 1 ? `New open order ${newcomers[0].order_number}` : `${newcomers.length} new open orders`} - tap to review`,
      7000,
    );
  }, [orders]);
}
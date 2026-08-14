import { useEffect, useRef } from 'react';
import { imperativeToast } from '../contexts/imperativeToast';
import { playStatusChime, unlockAudio } from './orderChime';
import { loadSoundPreferences } from './soundPreferences';

interface StatusAlertableOrder {
  id: number;
  order_number: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  completed: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
};

function labelFor(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Buyer-side alert - watches the polled "My Orders" list and fires a single
 * chime + toast when an order's status changes (open → completed/invoiced/etc).
 *
 * Skips the first render (baseline) and any status that is unknown/unlabelled.
 * Sound is OFF unless the persisted preference is enabled.
 */
export function useOrderStatusChime(orders: StatusAlertableOrder[]) {
  const baselineRef = useRef<Map<number, string> | null>(null);

  useEffect(() => {
    const prefs = loadSoundPreferences();
    if (prefs.orderSound) unlockAudio();

    const current = new Map(orders.map((o) => [o.id, o.status]));

    if (baselineRef.current === null) {
      baselineRef.current = current;
      return;
    }

    const previous = baselineRef.current;
    baselineRef.current = current;

    const changed = orders.filter((o) => {
      const prevStatus = previous.get(o.id);
      return prevStatus !== undefined && prevStatus !== o.status && o.status in STATUS_LABELS;
    });
    if (changed.length === 0) return;

    if (prefs.orderSound) playStatusChime(changed[0].status);
    imperativeToast.show(
      'info',
      changed.length === 1
        ? `Order ${changed[0].order_number} is now ${labelFor(changed[0].status)}`
        : `${changed.length} of your orders were updated`,
      7000,
    );
  }, [orders]);
}

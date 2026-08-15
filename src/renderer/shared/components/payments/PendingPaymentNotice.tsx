import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { useBillingHistory } from '../../api/account/SubscriptionQueries';

interface PendingPaymentNoticeProps {
  /** Switch to the History tab where pending payments can be synced. */
  onGoToHistory?: () => void;
}

/** LocalStorage key: dismissed pending payment ids, so new pendings resurface the banner. */
const DISMISS_KEY = 'custosell_dismissed_pending_payments';

function readDismissed(): number[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

/**
 * Subtle banner on the Plans tab when there are payments awaiting confirmation.
 * Guides the user to the History tab (where the Sync payment action lives) so
 * the plans page stays clean and the billing details live in one place.
 * "Review later" hides the banner for the current pending payments; if a NEW
 * pending payment appears it resurfaces.
 */
export default function PendingPaymentNotice({ onGoToHistory }: PendingPaymentNoticeProps) {
  const { data: historyItems = [] } = useBillingHistory();
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => readDismissed());

  useEffect(() => {
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissedIds));
    } catch {
      // localStorage may be unavailable (private browsing, quota, etc.) - ignore
    }
  }, [dismissedIds]);

  const pendingPayments = useMemo(
    () => historyItems.filter((item) => item.type === 'payment' && item.status === 'pending'),
    [historyItems],
  );

  const visiblePending = useMemo(
    () => pendingPayments.filter((item) => item.payment_id != null && !dismissedIds.includes(item.payment_id)),
    [pendingPayments, dismissedIds],
  );

  const pendingCount = visiblePending.length;
  if (pendingCount === 0) return null;

  const reviewLater = () => {
    const ids = visiblePending
      .map((item) => item.payment_id)
      .filter((id): id is number => id != null);
    setDismissedIds((prev) => [...new Set([...prev, ...ids])]);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2.5 text-sm text-amber-900">
        <Clock className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          {pendingCount} payment{pendingCount > 1 ? 's' : ''} awaiting confirmation.
        </span>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
        <button
          type="button"
          onClick={reviewLater}
          className="shrink-0 rounded-lg border border-amber-300 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
        >
          Review later
        </button>
        {onGoToHistory && (
          <button
            type="button"
            onClick={onGoToHistory}
            className="shrink-0 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 cursor-pointer"
          >
            Review in History
          </button>
        )}
      </div>
    </div>
  );
}

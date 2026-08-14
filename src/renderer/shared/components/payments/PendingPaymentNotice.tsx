import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useBillingHistory } from '../../api/account/SubscriptionQueries';

interface PendingPaymentNoticeProps {
  /** Switch to the History tab where pending payments can be synced. */
  onGoToHistory?: () => void;
}

/**
 * Subtle banner on the Plans tab when there are payments awaiting confirmation.
 * Guides the user to the History tab (where the Sync payment action lives) so
 * the plans page stays clean and the billing details live in one place.
 */
export default function PendingPaymentNotice({ onGoToHistory }: PendingPaymentNoticeProps) {
  const { data: historyItems = [] } = useBillingHistory();

  const pendingCount = useMemo(
    () => historyItems.filter((item) => item.type === 'payment' && item.status === 'pending').length,
    [historyItems],
  );

  if (pendingCount === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2.5 text-sm text-amber-900">
        <Clock className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          {pendingCount} payment{pendingCount > 1 ? 's' : ''} awaiting confirmation.
        </span>
      </div>
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
  );
}

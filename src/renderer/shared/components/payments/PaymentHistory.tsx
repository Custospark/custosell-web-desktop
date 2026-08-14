import { useMemo } from 'react';
import { CheckCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useBillingHistory, useConfirmPayment } from '../../api/account/SubscriptionQueries';
import type { BillingHistoryItem } from '../../api/account/SubscriptionQueries';
import { formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';

interface PaymentHistoryProps {
  className?: string;
  /**
   * 'pending-only' (Plans tab): show just the payments that need syncing and
   * render nothing when there are none — avoids duplicating the full history
   * that lives on the History tab.
   * 'full' (default): show the complete billing activity feed.
   */
  mode?: 'pending-only' | 'full';
}

/**
 * Self-serve billing history. If a payment was collected (e.g. PesaPal) but our
 * system didn't update because the webhook/IPN failed, the payment stays
 * 'pending' here and the user can tap "Sync payment" — which asks the gateway
 * for the real status and auto-approves it. This reduces support tickets for
 * "I paid but my plan didn't update".
 */
export default function PaymentHistory({ className, mode = 'full' }: PaymentHistoryProps) {
  const { data: items = [], isLoading } = useBillingHistory();

  const payments = useMemo(
    () => items.filter((item) => item.type === 'payment'),
    [items],
  );

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  // Pending-only mode (Plans tab): nothing to reconcile → render nothing so we
  // don't duplicate the History tab's empty state.
  if (mode === 'pending-only' && pendingCount === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-gray-200 bg-white/80 p-6 text-center', className)}>
        <p className="text-sm text-gray-500">No billing activity yet.</p>
      </div>
    );
  }

  const visiblePayments = mode === 'pending-only'
    ? payments.filter((p) => p.status === 'pending')
    : payments;

  if (visiblePayments.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white/80 p-4 sm:p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">Billing activity</h3>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <Clock className="h-3 w-3" />
            {pendingCount} payment{pendingCount > 1 ? 's' : ''} to sync
          </span>
        )}
      </div>

      <ul className="divide-y divide-gray-100">
        {visiblePayments.map((p) => (
          <PaymentHistoryRow key={p.payment_id ?? p.at} item={p} />
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        Paid but your plan still shows pending? Tap <span className="font-medium">Sync payment</span> to re-check with the
        payment provider — no support ticket needed.
      </p>
    </div>
  );
}

function PaymentHistoryRow({ item }: { item: BillingHistoryItem }) {
  const paymentId = item.payment_id;
  const confirm = useConfirmPayment(paymentId ?? 0);
  const isPending = item.status === 'pending';
  const isFailed = item.status === 'failed';

  const amount = item.amount ?? 0;
  const currency = item.currency ?? 'USD';
  const isCredit = amount < 0;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isPending
            ? 'bg-amber-50 text-amber-600'
            : isFailed
              ? 'bg-red-50 text-red-500'
              : 'bg-green-50 text-green-600',
        )}
      >
        {isPending ? (
          <Clock className="h-4 w-4" />
        ) : isFailed ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.event}</p>
        <p className="text-[11px] text-gray-400">
          {item.at ? new Date(item.at).toLocaleString() : ''}
          {item.method ? ` · ${item.method}` : ''}
          {isPending ? ' · awaiting confirmation' : ''}
        </p>
      </div>

      <span
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          isCredit ? 'text-green-600' : isPending ? 'text-gray-500' : 'text-gray-900',
        )}
      >
        {isCredit ? '-' : ''}
        {formatCurrency(Math.abs(amount), currency)}
      </span>

      {isPending && paymentId ? (
        <button
          type="button"
          onClick={() => void confirm.mutate()}
          disabled={confirm.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
        >
          {confirm.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Sync payment
        </button>
      ) : null}
    </li>
  );
}

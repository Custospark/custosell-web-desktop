import { useMemo } from 'react';
import { ArrowUp, ArrowDown, XCircle, CreditCard, RefreshCw, CalendarPlus } from 'lucide-react';
import { useBillingHistory, type HistoryItem } from '../api/billingReceipts';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { cn } from '../../../shared/utils/cn';

function formatMoney(amount: number | undefined, currency?: string | null): string {
  if (amount === undefined || amount === null) return '';
  const code = (currency || 'USD').toUpperCase();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(amount);
}

function eventIcon(item: HistoryItem) {
  if (item.type === 'payment') {
    if (item.payment_type === 'topup') {
      return { Icon: CalendarPlus, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    }
    return { Icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-100' };
  }
  if (item.type === 'credit') {
    return { Icon: RefreshCw, color: 'text-green-600 bg-green-50 border-green-100' };
  }
  if (item.change_type === 'upgrade') return { Icon: ArrowUp, color: 'text-green-600 bg-green-50 border-green-100' };
  if (item.change_type === 'downgrade') return { Icon: ArrowDown, color: 'text-amber-600 bg-amber-50 border-amber-100' };
  if (item.change_type === 'cancel') return { Icon: XCircle, color: 'text-red-600 bg-red-50 border-red-100' };
  return { Icon: ArrowUp, color: 'text-blue-600 bg-blue-50 border-blue-100' };
}

function statusBadge(item: HistoryItem) {
  const status = item.status_override ?? item.status;
  if (status === 'applied') return { label: 'Applied', cls: 'bg-green-100 text-green-700' };
  if (status === 'pending') return { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700' };
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' };
  if (status === 'failed') return { label: 'Failed', cls: 'bg-red-100 text-red-700' };
  if (status === 'refunded') return { label: 'Refunded', cls: 'bg-red-100 text-red-700' };
  if (status === 'completed' || status === 'successful') return { label: 'Completed', cls: 'bg-green-100 text-green-700' };
  return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
}

function whenLabel(item: HistoryItem): string {
  if (item.type === 'change' && item.status_override === 'pending' && item.effective_at) {
    return `Effective ${new Date(item.effective_at).toLocaleDateString()}`;
  }
  if (item.at) {
    const d = new Date(item.at);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return '';
}

function itemTitle(item: HistoryItem): string {
  if (item.type === 'payment') {
    const amount = formatMoney(item.amount, item.currency);
    const extra = item.topup_months ? ` (${item.topup_months} months)` : '';
    return `${item.event}${extra} — ${amount}`;
  }
  if (item.type === 'credit') {
    return `${item.event} — ${formatMoney(item.amount, item.currency)}`;
  }
  if (item.change_type === 'upgrade') {
    return `Upgrade to ${item.to_plan ?? ''}`.trim();
  }
  if (item.change_type === 'downgrade') {
    return `Downgrade to ${item.to_plan ?? ''}`.trim();
  }
  if (item.change_type === 'cancel') {
    return 'Subscription cancellation';
  }
  return item.event || 'Change';
}

export default function HistoryTab() {
  const { data: feed, isLoading } = useBillingHistory();
  const items = useMemo(() => feed ?? [], [feed]);
  const paginated = usePagination(items, 12);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Billing Activity</h3>
        <p className="text-xs text-gray-500 mt-0.5">A full timeline of payments, top-ups, plan changes, and credit applications.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <CustosellLoader fullPage={false} />
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="relative pl-8 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {paginated.data.map((item, idx) => {
              const { Icon, color } = eventIcon(item);
              const badge = statusBadge(item);
              return (
                <div key={idx} className="relative">
                  <div className={cn('absolute -left-8 top-0 w-6 h-6 rounded-full border flex items-center justify-center', color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{itemTitle(item)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{whenLabel(item) || <span className="text-gray-400">{item.transaction_reference}</span>}</p>
                    </div>
                    <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={paginated.page}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                pageSize={paginated.pageSize}
                onPageChange={paginated.setPage}
                onPageSizeChange={paginated.setPageSize}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">No billing activity recorded yet.</p>
      )}
    </div>
  );
}
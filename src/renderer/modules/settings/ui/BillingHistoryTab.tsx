import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, XCircle, CreditCard, RefreshCw, CalendarPlus, Download, Mail, Loader2 } from 'lucide-react';
import { useBillingHistory, downloadReceiptPdf, saveBlobDownload, type HistoryItem } from '../api/billingReceipts';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../../shared/utils/cn';
import EmailReceiptModal from './EmailReceiptModal';
import PaymentHistory from '../../../shared/components/payments/PaymentHistory';

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
    return `${item.event}${extra} - ${amount}`;
  }
  if (item.type === 'credit') {
    return `${item.event} - ${formatMoney(item.amount, item.currency)}`;
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
  const user = useAppSelector((state) => state.auth.user);
  const defaultEmail = user?.email ?? '';
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<HistoryItem | null>(null);
  const items = useMemo(() => feed ?? [], [feed]);
  const paginated = usePagination(items, 12);

  const handleDownload = async (item: HistoryItem) => {
    if (item.payment_id === undefined) return;
    setDownloadingId(item.payment_id);
    try {
      const { blob, filename } = await downloadReceiptPdf(item.payment_id);
      saveBlobDownload(blob, filename);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Billing History</h3>
        <p className="text-xs text-gray-500 mt-0.5">Every charge, top-up, plan change, and credit application - newest first.</p>
      </div>

      <PaymentHistory mode="pending-only" className="mb-5" />

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
                      <p className="text-xs text-gray-500 mt-0.5">{whenLabel(item) || (item.transaction_reference ? <span className="text-gray-400">{item.transaction_reference}</span> : null)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full', badge.cls)}>
                        {badge.label}
                      </span>
                      {item.type === 'payment' && item.payment_id !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDownload(item)}
                            disabled={downloadingId === item.payment_id}
                            title="Download receipt (PDF)"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === item.payment_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailTarget(item)}
                            title="Email receipt (PDF)"
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </button>
                        </div>
                      )}
                    </div>
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
      <EmailReceiptModal
        open={emailTarget !== null}
        paymentId={emailTarget?.payment_id ?? 0}
        reference={emailTarget?.transaction_reference}
        amount={String(emailTarget?.amount ?? 0)}
        currency={emailTarget?.currency ?? ''}
        defaultEmail={defaultEmail}
        onClose={() => setEmailTarget(null)}
      />
    </div>
  );
}
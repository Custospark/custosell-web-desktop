import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Download, Mail, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { BILLING } from '../../../shared/api/endpoints/endpoints';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { downloadReceiptPdf, saveBlobDownload } from '../api/billingReceipts';
import EmailReceiptModal from './EmailReceiptModal';
import type { PaymentType } from '../../../shared/types';

interface BillingPaymentRecord {
  id: number;
  amount: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  payment_type?: PaymentType | string;
  method?: string;
  transaction_reference?: string;
  description?: string;
  created_at: string;
}

export default function BillingPaymentsTab() {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<BillingPaymentRecord | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const defaultEmail = user?.email ?? '';

  const { data: payments, isLoading } = useQuery<BillingPaymentRecord[]>({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BillingPaymentRecord[] }>(BILLING.PAYMENTS);
      return data.data;
    },
  });

  const paymentsPaginated = usePagination(payments ?? [], 10);

  const handleDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      const { blob, filename } = await downloadReceiptPdf(id);
      saveBlobDownload(blob, filename);
    } finally {
      setDownloadingId(null);
    }
  };

  const typeLabel = (t?: string) => {
    const labels: Record<string, string> = {
      onboarding: 'Setup fee',
      subscription: 'Subscription',
      renewal: 'Renewal',
      topup: 'Top-up',
      upgrade_proration: 'Upgrade',
      billing_cycle_change: 'Cycle change',
    };
    return t ? (labels[t] ?? t.replace(/_/g, ' ')) : 'Payment';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Payment History</h3>
          <p className="text-xs text-gray-500 mt-0.5">Every charge against your subscription, with downloadable receipts.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <CustosellLoader fullPage={false} />
        </div>
      ) : payments && payments.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {paymentsPaginated.data.map((payment) => {
            const StatusIcon = payment.status === 'completed' ? CheckCircle : payment.status === 'failed' ? XCircle : Clock;
            const statusColor = payment.status === 'completed' ? '#16a34a' : payment.status === 'failed' ? '#dc2626' : '#d97706';
            return (
              <div key={payment.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('en-UG', { style: 'currency', currency: payment.currency || 'UGX', maximumFractionDigits: 0 }).format(Number(payment.amount))}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                      {typeLabel(payment.payment_type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(payment.created_at).toLocaleDateString()}</p>
                  {payment.transaction_reference && (
                    <p className="text-[11px] text-gray-400 font-mono">{payment.transaction_reference}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize" style={{ color: statusColor }}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{payment.status}</span>
                  </span>
                  {payment.status === 'completed' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleDownload(payment.id)}
                        disabled={downloadingId === payment.id}
                        title="Download receipt (PDF)"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {downloadingId === payment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailTarget(payment)}
                        title="Email receipt (PDF)"
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">No payment records found.</p>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={paymentsPaginated.page}
            totalPages={paymentsPaginated.totalPages}
            totalItems={paymentsPaginated.totalItems}
            pageSize={paymentsPaginated.pageSize}
            onPageChange={paymentsPaginated.setPage}
            onPageSizeChange={paymentsPaginated.setPageSize}
          />
        </div>
      )}
      <EmailReceiptModal
        open={emailTarget !== null}
        paymentId={emailTarget?.id ?? 0}
        reference={emailTarget?.transaction_reference}
        amount={emailTarget?.amount ?? '0'}
        currency={emailTarget?.currency ?? ''}
        defaultEmail={defaultEmail}
        onClose={() => setEmailTarget(null)}
      />
    </div>
  );
}
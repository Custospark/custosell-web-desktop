import { useState } from 'react';
import type { Payment } from './paymentTypes';
import type { Sale } from '../sales/api/salesTypes';
import type { Invoice } from '../invoices/api/InvoiceTypes';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../shared/utils/formatDateTime';
import { viewPaymentReceiptPdf, downloadPaymentReceiptPdf } from './usePaymentPdf';
import PaymentReceiptModal from './PaymentReceiptModal';
import { Eye, Download, Receipt, Paperclip, ChevronRight } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

interface PaymentHistoryListProps {
  payments: Payment[];
  totalBill?: number;
  referenceLabel?: string;
  referenceType?: 'Sale' | 'Invoice';
  sale?: Sale;
  invoice?: Invoice;
  compact?: boolean;
  className?: string;
  /** When false, hide remote PDF buttons (B2C storefront buyers). In-app preview still works. */
  allowRemotePdf?: boolean;
}

export default function PaymentHistoryList({
  payments,
  totalBill,
  referenceLabel,
  referenceType = 'Sale',
  sale,
  invoice,
  compact,
  className,
  allowRemotePdf = true,
}: PaymentHistoryListProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyType, setBusyType] = useState<'view' | 'download' | null>(null);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  const sorted = [...payments].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500', className)}>
        No payments recorded yet.
      </div>
    );
  }

  async function handleViewPdf(payment: Payment, e: React.MouseEvent) {
    e.stopPropagation();
    if (payment.id <= 0 || payment._pendingSync) return;
    setBusyId(payment.id);
    setBusyType('view');
    try {
      await viewPaymentReceiptPdf(payment.id);
    } finally {
      setBusyId(null);
      setBusyType(null);
    }
  }

  async function handleDownload(payment: Payment, e: React.MouseEvent) {
    e.stopPropagation();
    if (payment.id <= 0 || payment._pendingSync) return;
    setBusyId(payment.id);
    setBusyType('download');
    try {
      await downloadPaymentReceiptPdf(payment.id, payment.receipt_number);
    } finally {
      setBusyId(null);
      setBusyType(null);
    }
  }

  const totalPaid = sorted.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {!compact && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Receipt className="w-4 h-4 text-gray-500" />
              Payment history ({sorted.length})
            </div>
            {totalBill != null && (
              <span className="text-xs text-gray-500 tabular-nums">
                {formatCurrency(totalPaid)} of {formatCurrency(totalBill)} paid
              </span>
            )}
          </div>
        )}

        {compact && totalBill != null && (
          <p className="text-xs text-gray-500 tabular-nums">
            {formatCurrency(totalPaid)} of {formatCurrency(totalBill)} paid · {sorted.length} record{sorted.length === 1 ? '' : 's'}
          </p>
        )}

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {sorted.map((payment, index) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => setPreviewPayment(payment)}
              className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 bg-white hover:bg-blue-50/40 text-left transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-gray-900 truncate">{payment.receipt_number}</p>
                  <p className="text-xs text-gray-500">
                    {formatShiftDate(payment.paid_at)} · {payment.payment_method.replace('_', ' ')}
                    {payment._pendingSync && ' · pending sync'}
                    {(payment.email_sent_count ?? 0) > 0 && (
                      <span className="text-violet-600"> · Emailed {payment.email_sent_count}×</span>
                    )}
                  </p>
                  {payment.notes && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{payment.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700 tabular-nums">{formatCurrency(payment.amount)}</p>
                  <p className="text-[10px] text-gray-400 tabular-nums">
                    Bal. {formatCurrency(payment.balance_after)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {payment.attachment_url && (
                    <a
                      href={payment.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="View attachment"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {allowRemotePdf && payment.id > 0 && !payment._pendingSync && (
                    <>
                      <span
                        role="button"
                        tabIndex={0}
                        title="View PDF"
                        onClick={(e) => void handleViewPdf(payment, e)}
                        onKeyDown={(e) => e.key === 'Enter' && void handleViewPdf(payment, e as unknown as React.MouseEvent)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                      >
                        {busyId === payment.id && busyType === 'view' ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        title="Download PDF"
                        onClick={(e) => void handleDownload(payment, e)}
                        onKeyDown={(e) => e.key === 'Enter' && void handleDownload(payment, e as unknown as React.MouseEvent)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
                      >
                        {busyId === payment.id && busyType === 'download' ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">Tap any payment to preview its receipt.</p>
      </div>

      {previewPayment && referenceLabel && (
        <PaymentReceiptModal
          payment={previewPayment}
          sale={sale}
          invoice={invoice}
          referenceLabel={referenceLabel}
          referenceType={referenceType}
          totalBill={totalBill}
          totalPaidOnPayable={sorted
            .slice(0, sorted.findIndex((p) => p.id === previewPayment.id) + 1)
            .reduce((s, p) => s + p.amount, 0)}
          onClose={() => setPreviewPayment(null)}
        />
      )}
    </>
  );
}

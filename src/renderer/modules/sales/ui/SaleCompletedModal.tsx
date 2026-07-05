import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import {
  Printer, Plus, CheckCircle, X, FileText, Mail, ChevronRight, Receipt,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import ReceiptContent from './receipt/ReceiptContent';
import PaymentReceiptModal from '../../payments/PaymentReceiptModal';
import SendDocumentEmailModal from '../../../shared/components/email/SendDocumentEmailModal';
import type { SendDocumentEmailResult } from '../../../shared/hooks/useDocumentEmail';
import type { Payment } from '../../payments/paymentTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { netSaleAmount } from '../utils/saleAmounts';
import { MODAL_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  lastPayment?: Payment | null;
  onNewSale: () => void;
  onClose?: () => void;
  onGenerateInvoice?: () => void;
}

interface ActionRowProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: ReactNode;
  tone?: 'default' | 'violet';
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  disabled,
  badge,
  tone = 'default',
}: ActionRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:border-blue-200 hover:bg-blue-50/40',
        tone === 'violet' && !disabled && 'hover:border-violet-200 hover:bg-violet-50/40',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tone === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {badge}
        </span>
        {hint && (
          <span className="block text-[11px] text-gray-500 mt-0.5 truncate">{hint}</span>
        )}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-gray-500" />
    </button>
  );
}

export default function SaleCompletedModal({
  sale,
  lastPayment,
  onNewSale,
  onClose,
  onGenerateInvoice,
}: SaleCompletedModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paymentReceiptOpen, setPaymentReceiptOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const paymentForEmail = lastPayment;
  const baseEmailSentCount = lastPayment?.email_sent_count ?? 0;
  const [emailSentOverride, setEmailSentOverride] = useState<number | null>(null);
  const emailSyncKey = lastPayment ? `${lastPayment.id}:${baseEmailSentCount}` : '';
  const [prevEmailSyncKey, setPrevEmailSyncKey] = useState(emailSyncKey);
  if (emailSyncKey !== prevEmailSyncKey) {
    setPrevEmailSyncKey(emailSyncKey);
    setEmailSentOverride(null);
  }
  const emailSentCount = emailSentOverride ?? baseEmailSentCount;

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale?.receipt_number ?? 'receipt',
    pageStyle: `
      @page { margin: 0; }
      @media print {
        html, body { margin: 0; padding: 0; width: auto; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
        .no-print { display: none !important; }
      }
    `,
  });

  if (!sale) return null;

  const amountPaid = parseFloat(String(sale.amount_paid ?? sale.total_amount));
  const totalAmount = netSaleAmount(sale);
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const isPartial = sale.payment_status === 'partially_paid' || balanceDue > 0.009;
  const canEmailReceipt = paymentForEmail != null && paymentForEmail.id > 0 && !paymentForEmail._pendingSync;
  const showInvoice = Boolean(onGenerateInvoice && sale.id > 0 && (sale.sale_items?.length ?? 0) > 0);
  const hasPaymentReceipt = Boolean(lastPayment);
  const hasDocumentActions = showInvoice || hasPaymentReceipt;

  if (paymentReceiptOpen && lastPayment) {
    return (
      <PaymentReceiptModal
        payment={lastPayment}
        referenceLabel={sale.receipt_number}
        referenceType="Sale"
        totalBill={totalAmount}
        totalPaidOnPayable={amountPaid}
        onClose={() => { setPaymentReceiptOpen(false); onNewSale(); }}
      />
    );
  }

  return (
    <>
    {createPortal(
    <div className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} flex items-center justify-center p-3 sm:p-4 pointer-events-none no-print`}>
      <div
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 w-full max-h-[92vh] flex flex-col relative overflow-hidden"
        style={{ maxWidth: '520px' }}
      >
        <button
          type="button"
          onClick={onClose ?? onNewSale}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header — fixed */}
        <div className="shrink-0 px-5 pt-6 pb-4 text-center border-b border-gray-100">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Thank you for trusting us!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isPartial ? 'Partial payment recorded' : 'Sale completed successfully'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Receipt</p>
              <p className="text-sm font-mono font-semibold text-gray-900 truncate mt-0.5">{sale.receipt_number}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{formatCurrency(totalAmount)}</p>
            </div>
            {isPartial && (
              <>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Paid now</p>
                  <p className="text-sm font-bold text-emerald-800 tabular-nums mt-0.5">{formatCurrency(amountPaid)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Balance</p>
                  <p className="text-sm font-bold text-amber-800 tabular-nums mt-0.5">{formatCurrency(balanceDue)}</p>
                </div>
              </>
            )}
          </div>

          {sale._pendingSync && (
            <p className="text-xs text-amber-600 font-medium mt-3">
              Saved locally — will sync when you&apos;re back online
            </p>
          )}
        </div>

        {/* Receipt preview — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-gray-50/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">
            Receipt preview
          </p>
          <div className="flex justify-center">
            <ReceiptContent ref={receiptRef} sale={sale} />
          </div>
        </div>

        {/* Actions — fixed footer */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 space-y-4">
          {hasDocumentActions && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-0.5">
                Documents
              </p>
              <div className="space-y-1.5">
                {showInvoice && (
                  <ActionRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Invoice"
                    hint="Create a billing document for this sale"
                    onClick={() => onGenerateInvoice?.()}
                  />
                )}
                {hasPaymentReceipt && lastPayment && (
                  <ActionRow
                    icon={<Receipt className="w-4 h-4" />}
                    label="Payment receipt"
                    hint={lastPayment.receipt_number}
                    onClick={() => setPaymentReceiptOpen(true)}
                  />
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-0.5">
              Share &amp; print
            </p>
            <div className="space-y-1.5">
              {canEmailReceipt && paymentForEmail && (
                <ActionRow
                  icon={<Mail className="w-4 h-4" />}
                  label="Email receipt"
                  hint={sale.customer?.email ?? 'Send PDF to customer'}
                  tone="violet"
                  onClick={() => setEmailOpen(true)}
                  badge={emailSentCount > 0 ? (
                    <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full tabular-nums">
                      {emailSentCount}×
                    </span>
                  ) : undefined}
                />
              )}
              <ActionRow
                icon={<Printer className="w-4 h-4" />}
                label={isPartial ? 'Print sale summary' : 'Print receipt'}
                hint="Paper copy for the customer"
                onClick={() => handlePrint()}
              />
            </div>
          </div>

          <Button className="w-full h-12 text-base font-semibold" onClick={onNewSale}>
            <Plus className="w-4 h-4 mr-2" />
            New sale
          </Button>
        </div>
      </div>
    </div>,
    document.body,
    )}

    {emailOpen && paymentForEmail && (
      <SendDocumentEmailModal
        open
        onClose={() => setEmailOpen(false)}
        documentType="payment_receipt"
        documentId={paymentForEmail.id}
        documentLabel={`Receipt ${paymentForEmail.receipt_number}`}
        customerName={sale.customer?.name}
        defaultEmail={sale.customer?.email}
        customerId={sale.customer_id}
        saleId={sale.id}
        emailSentCount={emailSentCount}
        onSent={(result: SendDocumentEmailResult) => {
          setEmailSentOverride(result.email_sent_count);
        }}
        blocked={!canEmailReceipt}
        blockedReason={paymentForEmail._pendingSync ? 'Receipt must sync before it can be emailed.' : undefined}
      />
    )}
    </>
  );
}

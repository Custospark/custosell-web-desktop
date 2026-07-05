import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle, X, FileText, Mail } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import ReceiptContent from './receipt/ReceiptContent';
import PaymentReceiptModal from '../../payments/PaymentReceiptModal';
import SendDocumentEmailModal from '../../../shared/components/email/SendDocumentEmailModal';
import { EmailSentCountBadge, emailSentLabel } from '../../../shared/components/email/EmailSentCountBadge';
import type { SendDocumentEmailResult } from '../../../shared/hooks/useDocumentEmail';
import type { Payment } from '../../payments/paymentTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { netSaleAmount } from '../utils/saleAmounts';
import { MODAL_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  lastPayment?: Payment | null;
  onNewSale: () => void;
  onClose?: () => void;
  onGenerateInvoice?: () => void;
}

const actionBtnClass = 'min-h-11 py-2.5 px-4 text-sm';

export default function SaleCompletedModal({ sale, lastPayment, onNewSale, onClose, onGenerateInvoice }: SaleCompletedModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
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

  if (showPaymentReceipt && lastPayment) {
    return (
      <PaymentReceiptModal
        payment={lastPayment}
        referenceLabel={sale.receipt_number}
        referenceType="Sale"
        totalBill={totalAmount}
        totalPaidOnPayable={amountPaid}
        onClose={() => { setShowPaymentReceipt(false); onNewSale(); }}
      />
    );
  }

  return (
    <>
    {createPortal(
    <div className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} flex items-center justify-center p-3 sm:p-4 pointer-events-none no-print`}>
      <div
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 w-full p-4 sm:p-6 lg:p-8 flex flex-col relative"
        style={{ maxWidth: '560px' }}
      >
        <button
          type="button"
          onClick={onClose ?? onNewSale}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1">
          {isPartial ? 'Partial payment recorded' : 'Sale completed'}
        </h2>
        {isPartial && (
          <p className="text-sm text-center text-amber-700 mb-3 tabular-nums">
            {formatCurrency(amountPaid)} paid · {formatCurrency(balanceDue)} remaining
          </p>
        )}

        {sale._pendingSync && (
          <p className="text-xs text-amber-600 font-medium text-center mb-3 sm:mb-4">
            Saved locally — will sync when you&apos;re back online
          </p>
        )}

        <div className="flex justify-center overflow-x-auto">
          <ReceiptContent ref={receiptRef} sale={sale} />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mt-4">
          {onGenerateInvoice && sale.id > 0 && (sale.sale_items?.length ?? 0) > 0 && (
            <Button className={actionBtnClass} variant="outline" onClick={onGenerateInvoice}>
              <FileText className="w-4 h-4 mr-1.5 shrink-0" />
              Invoice
            </Button>
          )}
          {lastPayment && (
            <Button className={actionBtnClass} variant="outline" onClick={() => setShowPaymentReceipt(true)}>
              <FileText className="w-4 h-4 mr-1.5 shrink-0" />
              Payment receipt
            </Button>
          )}
          {canEmailReceipt && paymentForEmail && (
            <Button
              className={actionBtnClass}
              variant="outline"
              onClick={() => setEmailOpen(true)}
              title={emailSentLabel(emailSentCount)}
            >
              <span className="relative inline-flex items-center justify-center">
                <Mail className="w-4 h-4 mr-1.5 shrink-0" />
                Email receipt
                <EmailSentCountBadge count={emailSentCount} className="-top-2 -right-3" />
              </span>
            </Button>
          )}
          <Button className={actionBtnClass} variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5 shrink-0" />
            {isPartial ? 'Sale summary' : 'Print receipt'}
          </Button>
          <Button className={actionBtnClass} onClick={onNewSale}>
            <Plus className="w-4 h-4 mr-1.5 shrink-0" />
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

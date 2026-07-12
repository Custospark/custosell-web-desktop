import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle, X, FileText, Mail, Download, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import ReceiptContent from './receipt/ReceiptContent';
import PaymentReceiptModal from '../../payments/PaymentReceiptModal';
import SendDocumentEmailModal from '../../../shared/components/email/SendDocumentEmailModal';
import type { SendDocumentEmailResult } from '../../../shared/hooks/useDocumentEmail';
import { useWebShare, receiptShareText } from '../../../shared/hooks/useWebShare';
import type { Payment } from '../../payments/paymentTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { netSaleAmount } from '../utils/saleAmounts';
import { MODAL_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { FiscalStatusBadge } from '../../../shared/components/badges/FiscalStatusBadge';

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
  const [emailType, setEmailType] = useState<'payment_receipt' | 'sale_receipt'>('payment_receipt');
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
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business;
  const { share } = useWebShare();
  const [showMore, setShowMore] = useState(false);

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

  const handleDownloadPdf = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale?.receipt_number ?? 'receipt',
    pageStyle: `
      @page { margin: 0; size: auto; }
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
  const canEmailFullReceipt = sale.id > 0 && !sale._pendingSync;
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
        {(sale.fiscal_status === 'pending' || sale.fiscal_status === 'fiscalized' || sale.fiscal_status === 'failed') && (
          <div className="flex flex-col items-center gap-1 mb-3 sm:mb-4">
            <FiscalStatusBadge status={sale.fiscal_status} />
            {sale.fiscal_status === 'failed' && sale.fiscal_last_error ? (
              <p className="text-xs text-red-600 text-center max-w-sm">{sale.fiscal_last_error}</p>
            ) : null}
            {sale.fiscal_status === 'pending' ? (
              <p className="text-xs text-amber-700 text-center">Fiscal receipt will update when URA confirms</p>
            ) : null}
          </div>
        )}

        <div className="flex justify-center overflow-x-auto">
          <ReceiptContent ref={receiptRef} sale={sale} />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mt-4">
          <Button className={actionBtnClass} variant="outline" onClick={handleDownloadPdf} title="Save this receipt as a PDF file">
            <Download className="w-4 h-4 mr-1.5 shrink-0" />
            Download PDF
          </Button>
          <Button className={actionBtnClass} variant="outline" onClick={handlePrint} title="Print a paper copy of this receipt">
            <Printer className="w-4 h-4 mr-1.5 shrink-0" />
            {isPartial ? 'Sale summary' : 'Print'}
          </Button>
          <Button className={actionBtnClass} onClick={onNewSale} title="Start a new sale">
            <Plus className="w-4 h-4 mr-1.5 shrink-0" />
            New sale
          </Button>

          <div className="relative">
            <Button
              className={actionBtnClass}
              variant="outline"
              onClick={() => setShowMore((p) => !p)}
              onBlur={() => setTimeout(() => setShowMore(false), 200)}
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4 shrink-0" />
            </Button>

            {showMore && (
              <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[200px] rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
                <div className="py-1">
                  {onGenerateInvoice && sale.id > 0 && (sale.sale_items?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Generate an invoice from this sale"
                      onClick={() => { onGenerateInvoice(); setShowMore(false); }}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-gray-500" />
                      Invoice
                    </button>
                  )}
                  {lastPayment && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      title="View the payment receipt for this sale"
                      onClick={() => { setShowPaymentReceipt(true); setShowMore(false); }}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-gray-500" />
                      Payment receipt
                    </button>
                  )}
                  {canEmailFullReceipt && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Email this receipt to the customer"
                      onClick={() => { setEmailType('sale_receipt'); setEmailOpen(true); setShowMore(false); }}
                    >
                      <Mail className="w-4 h-4 shrink-0 text-gray-500" />
                      Email receipt
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Share this receipt with others"
                    onClick={() => { void share({
                      title: `Receipt ${sale.receipt_number}`,
                      text: receiptShareText(
                        business?.name ?? 'Business',
                        sale.receipt_number,
                        totalAmount,
                        business?.currency || 'UGX',
                        sale.payment_method,
                      ),
                    }); setShowMore(false); }}
                  >
                    <Share2 className="w-4 h-4 shrink-0 text-gray-500" />
                    Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
    )}

    {emailOpen && emailType === 'payment_receipt' && paymentForEmail && (
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
    {emailOpen && emailType === 'sale_receipt' && (
      <SendDocumentEmailModal
        open
        onClose={() => setEmailOpen(false)}
        documentType="sale_receipt"
        documentId={sale.id}
        documentLabel={`Receipt ${sale.receipt_number}`}
        customerName={sale.customer?.name}
        defaultEmail={sale.customer?.email}
        customerId={sale.customer_id}
        saleId={sale.id}
        blocked={!canEmailFullReceipt}
        blockedReason={sale._pendingSync ? 'Receipt must sync before it can be emailed.' : undefined}
      />
    )}
    </>
  );
}

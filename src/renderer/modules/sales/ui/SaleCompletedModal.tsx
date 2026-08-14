import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle, X, FileText, Mail, Download, Share2 } from 'lucide-react';
import ReceiptContent from './receipt/ReceiptContent';
import { ReceiptActionBar } from './receipt/ReceiptActionBar';
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
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { downloadSalesReceiptPdf } from '../useSalesReceiptPdf';
import { FiscalStatusBadge } from '../../../shared/components/badges/FiscalStatusBadge';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  lastPayment?: Payment | null;
  onNewSale: () => void;
  onClose?: () => void;
  onGenerateInvoice?: () => void;
}

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
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

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

  const handlePrintToPdf = useReactToPrint({
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

  // Download the server-generated receipt PDF (Documents-module blob standard).
  // Pending/local sales have no server PDF yet - fall back to a print-based file.
  const handleDownloadPdf = async () => {
    if (!sale) return;
    if (sale.id > 0 && !sale._pendingSync) {
      try {
        setDownloading(true);
        await downloadSalesReceiptPdf(sale.id);
      } catch (err) {
        showToast('error', sanitizeErrorMessage(err, 'Failed to download receipt PDF'));
        handlePrintToPdf();
      } finally {
        setDownloading(false);
      }
      return;
    }
    handlePrintToPdf();
  };

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
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 w-full p-4 sm:p-6 lg:p-8 flex flex-col relative max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden"
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
            Saved locally - will sync when you&apos;re back online
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

        <div className="flex items-start justify-center overflow-x-auto flex-1 min-h-0 overflow-y-auto">
          <ReceiptContent ref={receiptRef} sale={sale} />
        </div>

        <ReceiptActionBar
          className="mt-4"
          actions={[
            {
              key: 'pdf',
              label: 'Download PDF',
              icon: <Download className="h-4 w-4" />,
              onClick: handleDownloadPdf,
              loading: downloading,
              title: 'Save this receipt as a PDF file',
            },
            {
              key: 'print',
              label: isPartial ? 'Sale summary' : 'Print',
              icon: <Printer className="h-4 w-4" />,
              onClick: handlePrint,
              title: 'Print a paper copy of this receipt',
            },
            {
              key: 'new',
              label: 'New sale',
              icon: <Plus className="h-4 w-4" />,
              onClick: onNewSale,
              primary: true,
              title: 'Start a new sale',
            },
          ]}
          moreActions={[
            ...(onGenerateInvoice && sale.id > 0 && (sale.sale_items?.length ?? 0) > 0
              ? [{
                  key: 'invoice',
                  label: 'Invoice',
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => onGenerateInvoice(),
                  title: 'Generate an invoice from this sale',
                }]
              : []),
            ...(lastPayment
              ? [{
                  key: 'payment-receipt',
                  label: 'Payment receipt',
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => setShowPaymentReceipt(true),
                  title: 'View the payment receipt for this sale',
                }]
              : []),
            ...(canEmailFullReceipt
              ? [{
                  key: 'email',
                  label: 'Email receipt',
                  icon: <Mail className="h-4 w-4" />,
                  onClick: () => {
                    setEmailType('sale_receipt');
                    setEmailOpen(true);
                  },
                  title: 'Email this receipt to the customer',
                }]
              : []),
            {
              key: 'share',
              label: 'Share',
              icon: <Share2 className="h-4 w-4" />,
              onClick: () => {
                void share({
                  title: `Receipt ${sale.receipt_number}`,
                  text: receiptShareText(
                    business?.name ?? 'Business',
                    sale.receipt_number,
                    totalAmount,
                    business?.currency || 'UGX',
                    sale.payment_method,
                  ),
                });
              },
              title: 'Share this receipt with others',
            },
          ]}
        />
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

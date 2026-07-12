import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Modal } from '../../shared/components/modals/Modal';
import type { Payment } from './paymentTypes';
import type { Invoice } from '../invoices/api/InvoiceTypes';
import type { Sale } from '../sales/api/salesTypes';
import {
  buildBillDetailsFromInvoice,
  buildBillDetailsFromSale,
  type PaymentReceiptBillDetails,
} from './paymentReceiptDetails';
import { viewPaymentReceiptPdf, downloadPaymentReceiptPdf } from './usePaymentPdf';
import PaymentReceiptContent, { buildPaymentReceiptContext } from './PaymentReceiptContent';
import { CheckCircle2, Eye, Download, Printer, Mail, Paperclip } from 'lucide-react';
import SendDocumentEmailModal from '../../shared/components/email/SendDocumentEmailModal';
import { emailSentLabel } from '../../shared/components/email/EmailSentCountBadge';
import type { SendDocumentEmailResult } from '../../shared/hooks/useDocumentEmail';
import { cn } from '../../shared/utils/cn';
import { ReceiptActionBar } from '../sales/ui/receipt/ReceiptActionBar';

interface PaymentReceiptModalProps {
  payment: Payment;
  invoice?: Invoice;
  sale?: Sale;
  billDetails?: PaymentReceiptBillDetails | null;
  referenceLabel?: string;
  referenceType?: 'Sale' | 'Invoice';
  totalBill?: number;
  totalPaidOnPayable?: number;
  onClose: () => void;
}

export default function PaymentReceiptModal({
  payment,
  invoice,
  sale,
  billDetails: billDetailsProp,
  referenceLabel,
  referenceType = 'Invoice',
  totalBill,
  totalPaidOnPayable,
  onClose,
}: PaymentReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState<'view' | 'download' | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const baseEmailSentCount = payment.email_sent_count ?? 0;
  const [emailSentOverride, setEmailSentOverride] = useState<number | null>(null);
  const emailSyncKey = `${payment.id}:${baseEmailSentCount}`;
  const [prevEmailSyncKey, setPrevEmailSyncKey] = useState(emailSyncKey);
  if (emailSyncKey !== prevEmailSyncKey) {
    setPrevEmailSyncKey(emailSyncKey);
    setEmailSentOverride(null);
  }
  const emailSentCount = emailSentOverride ?? baseEmailSentCount;
  const refLabel = referenceLabel ?? invoice?.invoice_number ?? `#${payment.payable_id}`;
  const isPaidInFull = payment.balance_after <= 0;
  const canPdf = payment.id > 0 && !payment._pendingSync;
  const isReceivedInvoice = invoice?.direction === 'received';
  const defaultEmail = invoice?.customer?.email ?? sale?.customer?.email ?? null;
  const customerName = invoice?.customer?.name ?? sale?.customer?.name ?? undefined;
  const issuerBusiness = isReceivedInvoice ? (invoice?.seller_business ?? null) : null;

  const billDetails = billDetailsProp
    ?? (sale ? buildBillDetailsFromSale(sale) : invoice ? buildBillDetailsFromInvoice(invoice) : null);

  const context = buildPaymentReceiptContext(
    payment,
    refLabel,
    referenceType,
    totalBill ?? payment.amount + payment.balance_after,
    totalPaidOnPayable ?? (payment.amount + Math.max(0, (totalBill ?? 0) - payment.balance_after - payment.amount)),
  );

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: payment.receipt_number,
    pageStyle: `@page { margin: 0; } @media print { .no-print { display: none !important; } }`,
  });

  async function handleViewPdf() {
    if (!canPdf) return;
    setPdfBusy('view');
    try {
      await viewPaymentReceiptPdf(payment.id);
    } finally {
      setPdfBusy(null);
    }
  }

  async function handleDownloadPdf() {
    if (!canPdf) return;
    setPdfBusy('download');
    try {
      await downloadPaymentReceiptPdf(payment.id, payment.receipt_number);
    } finally {
      setPdfBusy(null);
    }
  }

  const moreActions = [
    ...(canPdf
      ? [
          {
            key: 'view-pdf',
            label: 'View PDF',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => void handleViewPdf(),
            loading: pdfBusy === 'view',
            title: 'Open PDF in browser',
          },
          {
            key: 'email',
            label: emailSentCount > 0 ? `Email (${emailSentCount})` : 'Email',
            icon: <Mail className="h-4 w-4" />,
            onClick: () => setEmailOpen(true),
            title: emailSentLabel(emailSentCount),
          },
        ]
      : []),
    ...(payment.attachment_url
      ? [
          {
            key: 'attachment',
            label: 'Attachment',
            icon: <Paperclip className="h-4 w-4" />,
            onClick: () => {
              window.open(payment.attachment_url!, '_blank', 'noopener,noreferrer');
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Modal isOpen onClose={onClose} title="Payment receipt" size="md" bodyClassName="px-5 py-4">
        <div className="space-y-4">
          <div className={cn(
            'rounded-2xl border px-4 py-3 no-print',
            isPaidInFull
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white'
              : 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white',
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isPaidInFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              )}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {isPaidInFull ? 'Paid in full' : 'Partial payment'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-gray-600">{payment.receipt_number}</p>
                {emailSentCount > 0 ? (
                  <p className="mt-0.5 text-[11px] text-violet-700">{emailSentLabel(emailSentCount)}</p>
                ) : null}
                {payment._pendingSync ? (
                  <p className="mt-1 text-xs text-amber-600">Saved locally — syncs when online</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <PaymentReceiptContent
              ref={receiptRef}
              payment={payment}
              context={context}
              billDetails={billDetails}
              issuerBusiness={issuerBusiness}
            />
          </div>

          <ReceiptActionBar
            actions={[
              ...(canPdf
                ? [
                    {
                      key: 'download',
                      label: 'Download PDF',
                      icon: <Download className="h-4 w-4" />,
                      onClick: () => void handleDownloadPdf(),
                      loading: pdfBusy === 'download',
                      title: 'Save this receipt as a PDF file',
                    },
                  ]
                : []),
              {
                key: 'print',
                label: 'Print',
                icon: <Printer className="h-4 w-4" />,
                onClick: handlePrint,
                title: 'Print a paper copy of this receipt',
              },
              {
                key: 'done',
                label: 'Done',
                icon: <CheckCircle2 className="h-4 w-4" />,
                onClick: onClose,
                primary: true,
                title: 'Close',
              },
            ]}
            moreActions={moreActions}
          />
        </div>
      </Modal>

      {emailOpen ? (
        <SendDocumentEmailModal
          open
          onClose={() => setEmailOpen(false)}
          documentType="payment_receipt"
          documentId={payment.id}
          documentLabel={`Receipt ${payment.receipt_number}`}
          customerName={customerName}
          defaultEmail={defaultEmail}
          customerId={sale?.customer_id ?? invoice?.customer_id}
          saleId={sale?.id}
          emailSentCount={emailSentCount}
          onSent={(result: SendDocumentEmailResult) => {
            setEmailSentOverride(result.email_sent_count);
          }}
          blocked={!canPdf}
          blockedReason={payment._pendingSync ? 'Receipt must sync before it can be emailed.' : undefined}
        />
      ) : null}
    </>
  );
}

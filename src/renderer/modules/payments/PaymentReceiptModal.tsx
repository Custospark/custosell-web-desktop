import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
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
import { CheckCircle2, Eye, Download, Printer } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

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
  const refLabel = referenceLabel ?? invoice?.invoice_number ?? `#${payment.payable_id}`;
  const isPaidInFull = payment.balance_after <= 0;
  const canPdf = payment.id > 0 && !payment._pendingSync;

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

  return (
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
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {isPaidInFull ? 'Paid in full' : 'Partial payment'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5 font-mono">{payment.receipt_number}</p>
              {payment._pendingSync && (
                <p className="text-xs text-amber-600 mt-1">Saved locally — syncs when online</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <PaymentReceiptContent ref={receiptRef} payment={payment} context={context} billDetails={billDetails} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 no-print">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print
          </Button>
          {canPdf && (
            <>
              <Button size="sm" variant="outline" onClick={() => void handleViewPdf()} loading={pdfBusy === 'view'}>
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleDownloadPdf()} loading={pdfBusy === 'download'}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            </>
          )}
          {payment.attachment_url && (
            <a
              href={payment.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            >
              Attachment
            </a>
          )}
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

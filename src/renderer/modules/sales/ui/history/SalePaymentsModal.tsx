import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, Printer, FileText } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import ReceiptContent from '../receipt/ReceiptContent';
import { ReceiptActionBar } from '../receipt/ReceiptActionBar';
import PaymentsPanel from '../../../payments/PaymentsPanel';
import PaymentReceiptModal from '../../../payments/PaymentReceiptModal';
import type { RecordPaymentInput } from '../../../payments/RecordPaymentForm';
import { useSale } from '../../api/salesQueries';
import { useRecordSalePayment, getPaymentErrorMessage } from '../../../payments/paymentQueries';
import { computeSaleBalance, computePayableTotal } from '../../../payments/payableBalance';
import type { Sale } from '../../api/salesTypes';
import type { Payment } from '../../../payments/paymentTypes';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';

interface SalePaymentsModalProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

export default function SalePaymentsModal({ sale, open, onClose }: SalePaymentsModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: freshSale } = useSale(sale.id);
  const activeSale = freshSale ?? sale;
  const payments = activeSale.payments ?? [];

  const totalAmount = computePayableTotal(activeSale, 'sale');
  const amountPaid = parseFloat(String(activeSale.amount_paid ?? 0));
  const remainingBalance = computeSaleBalance(activeSale);
  const canRecord = remainingBalance > 0.009 && activeSale.payment_status !== 'refunded';

  const recordPayment = useRecordSalePayment();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: activeSale.receipt_number,
    pageStyle: `@page { margin: 0; } @media print { .no-print { display: none !important; } }`,
  });

  const handleDownloadPdf = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: activeSale.receipt_number,
    pageStyle: `@page { margin: 0; size: auto; } @media print { .no-print { display: none !important; } }`,
  });

  function handleSubmit(input: RecordPaymentInput) {
    if (!canRecord) return;
    recordPayment.reset();
    recordPayment.mutate(
      { id: activeSale.id, ...input },
      { onSuccess: ({ payment }) => setReceiptPayment(payment) },
    );
  }

  if (receiptPayment) {
    return (
      <PaymentReceiptModal
        payment={receiptPayment}
        sale={activeSale}
        referenceLabel={activeSale.receipt_number}
        referenceType="Sale"
        totalBill={totalAmount}
        totalPaidOnPayable={amountPaid + receiptPayment.amount}
        onClose={() => setReceiptPayment(null)}
      />
    );
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="" size="lg" panelClassName="lg:max-w-4xl" bodyClassName="px-5 py-4">
      <PaymentsPanel
        referenceLabel={activeSale.receipt_number}
        referenceType="Sale"
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        remainingBalance={remainingBalance}
        payments={payments}
        canRecord={canRecord}
        sale={activeSale}
        defaultMethod={activeSale.payment_method || 'cash'}
        loading={recordPayment.isPending}
        errorMessage={recordPayment.isError ? getPaymentErrorMessage(recordPayment.error) : null}
        offline={isOffline}
        onSubmit={handleSubmit}
      >
        {showSummary ? (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700 no-print">Sale summary receipt</p>
            <div className="flex items-start justify-center overflow-x-auto">
              <ReceiptContent ref={receiptRef} sale={activeSale} />
            </div>
          </div>
        ) : (
          <div className="fixed -left-[9999px] top-0 w-[210mm] pointer-events-none" aria-hidden>
            <ReceiptContent ref={receiptRef} sale={activeSale} />
          </div>
        )}
        <ReceiptActionBar
          className="mt-4"
          actions={[
            {
              key: 'pdf',
              label: 'Download PDF',
              icon: <Download className="h-4 w-4" />,
              onClick: handleDownloadPdf,
              title: 'Save this sale as a PDF file',
            },
            {
              key: 'print',
              label: 'Print',
              icon: <Printer className="h-4 w-4" />,
              onClick: handlePrint,
              title: 'Print this sale',
            },
          ]}
          moreActions={[
            {
              key: 'summary',
              label: showSummary ? 'Hide sale summary' : 'View sale summary',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => setShowSummary((v) => !v),
              title: 'Toggle the sale summary receipt preview',
            },
          ]}
        />
      </PaymentsPanel>
    </Modal>
  );
}

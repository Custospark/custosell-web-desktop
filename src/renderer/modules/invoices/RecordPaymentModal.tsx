import { useState } from 'react';
import { useInvoice, useRecordPayment } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import type { Payment } from '../payments/paymentTypes';
import PaymentReceiptModal from '../payments/PaymentReceiptModal';
import PaymentsPanel from '../payments/PaymentsPanel';
import { getPaymentErrorMessage } from '../payments/paymentQueries';
import { computeInvoiceBalance, computePayableTotal } from '../payments/payableBalance';
import type { RecordPaymentInput } from '../payments/RecordPaymentForm';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { isReceivedInvoice } from './invoiceListHelpers';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentRecorded?: (result: { invoice: Invoice; payment: Payment }) => void;
  /** Force view-only even if issued (e.g. buyer opening receipts from PO). */
  viewOnly?: boolean;
}

export default function RecordPaymentModal({
  invoice,
  onClose,
  onPaymentRecorded,
  viewOnly = false,
}: RecordPaymentModalProps) {
  const { data: freshInvoice } = useInvoice(invoice.id);
  const activeInvoice = freshInvoice ?? invoice;
  const payments = activeInvoice.payments ?? [];
  const totalAmount = computePayableTotal(activeInvoice, 'invoice');
  const remainingBalance = computeInvoiceBalance(activeInvoice);
  const amountPaid = activeInvoice.amount_paid || 0;
  const received = viewOnly || isReceivedInvoice(activeInvoice);
  const canRecord = !received && remainingBalance > 0.009;

  const recordPayment = useRecordPayment();
  const [receiptPayment, setReceiptPayment] = useState<{ payment: Payment; invoice: Invoice } | null>(null);

  function handleSubmit(input: RecordPaymentInput) {
    if (!canRecord) return;
    recordPayment.reset();
    recordPayment.mutate(
      { id: activeInvoice.id, ...input },
      {
        onSuccess: (result) => {
          onPaymentRecorded?.(result);
          setReceiptPayment(result);
        },
      },
    );
  }

  if (receiptPayment) {
    return (
      <PaymentReceiptModal
        payment={receiptPayment.payment}
        invoice={receiptPayment.invoice}
        referenceLabel={receiptPayment.invoice.invoice_number}
        referenceType="Invoice"
        totalBill={totalAmount}
        totalPaidOnPayable={amountPaid + receiptPayment.payment.amount}
        onClose={() => {
          setReceiptPayment(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={canRecord ? 'Record payment' : 'Payment receipts'}
      subtitle={
        canRecord
          ? `Invoice ${activeInvoice.invoice_number} - post a receipt against the open balance.`
          : `Invoice ${activeInvoice.invoice_number} - view payment history and receipts.`
      }
      size="xl"
      panelClassName="lg:max-w-4xl"
      bodyClassName="px-6 py-4"
    >
      <PaymentsPanel
        referenceLabel={activeInvoice.invoice_number}
        referenceType="Invoice"
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        remainingBalance={remainingBalance}
        payments={payments}
        canRecord={canRecord}
        invoice={activeInvoice}
        loading={recordPayment.isPending}
        errorMessage={recordPayment.isError ? getPaymentErrorMessage(recordPayment.error) : null}
        viewOnlyNotice={
          received && remainingBalance > 0.009
            ? 'This is a supplier invoice. Only the seller can record payments - you can view receipts here.'
            : null
        }
        onDismissError={() => recordPayment.reset()}
        onSubmit={handleSubmit}
        onCancel={onClose}
      >
        {!canRecord ? (
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>Close</Button>
          </div>
        ) : null}
      </PaymentsPanel>
    </Modal>
  );
}

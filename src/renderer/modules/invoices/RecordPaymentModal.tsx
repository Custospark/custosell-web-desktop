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
import { X } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentRecorded?: (result: { invoice: Invoice; payment: Payment }) => void;
}

export default function RecordPaymentModal({ invoice, onClose, onPaymentRecorded }: RecordPaymentModalProps) {
  const { data: freshInvoice } = useInvoice(invoice.id);
  const activeInvoice = freshInvoice ?? invoice;
  const payments = activeInvoice.payments ?? [];
  const totalAmount = computePayableTotal(activeInvoice, 'invoice');
  const remainingBalance = computeInvoiceBalance(activeInvoice);
  const amountPaid = activeInvoice.amount_paid || 0;
  const canRecord = remainingBalance > 0.009;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl lg:max-w-3xl xl:max-w-4xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur px-5 py-4">
          <div />
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-1">
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
            onDismissError={() => recordPayment.reset()}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />

          {!canRecord && (
            <div className="flex justify-end border-t border-gray-100 pt-4 mt-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

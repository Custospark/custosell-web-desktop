/* eslint-disable react-refresh/only-export-components -- receipt content + context helper */
import { forwardRef } from 'react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../shared/utils/formatDateTime';
import ReceiptBusinessHeader, {
  useReceiptBusiness,
  type ReceiptBusinessSnapshot,
} from '../../shared/components/receipt/ReceiptBusinessHeader';
import type { Payment } from './paymentTypes';
import type { PaymentReceiptBillDetails } from './paymentReceiptDetails';
import PaymentReceiptLineItems from './PaymentReceiptLineItems';

export interface PaymentReceiptContext {
  referenceLabel: string;
  referenceType: 'Sale' | 'Invoice';
  totalBill: number;
  previousPaid: number;
  totalPaid: number;
}

interface PaymentReceiptContentProps {
  payment: Payment;
  context: PaymentReceiptContext;
  billDetails?: PaymentReceiptBillDetails | null;
  /** Issuing seller letterhead. When omitted, uses the logged-in business. */
  issuerBusiness?: ReceiptBusinessSnapshot | null;
  /** Branch where the payment was generated. */
  branch?: string | null;
}

const PaymentReceiptContent = forwardRef<HTMLDivElement, PaymentReceiptContentProps>(
  ({ payment, context, billDetails, issuerBusiness, branch }, ref) => {
    const business = useReceiptBusiness(issuerBusiness);
    const currency = business?.currency || 'UGX';
    const tendered = payment.amount_tendered ?? payment.amount;
    const change = payment.change_given ?? 0;

    return (
      <div
        ref={ref}
        className="receipt-print bg-white border border-gray-200 rounded-xl print:border-0 print:rounded-none print:bg-transparent print:shadow-none text-xs shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
        style={{ maxWidth: '320px' }}
      >
        <style>{`
          @media print {
            .receipt-print { max-width: 100% !important; width: 100%; border: none !important; box-shadow: none !important; }
          }
        `}</style>
        <div className="p-4 print:px-2 print:py-3">
          <ReceiptBusinessHeader subtitle="Payment Receipt" business={issuerBusiness} />

          <div className="border-t border-dashed border-gray-400 border-b py-2 mb-3 text-xs text-gray-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Receipt #</span>
              <span className="font-mono font-medium text-gray-800">{payment.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{formatShiftDate(payment.paid_at)}</span>
            </div>
            {branch ? (
              <div className="flex justify-between">
                <span>Branch</span>
                <span className="font-medium">{branch}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>Method</span>
              <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>{context.referenceType}</span>
              <span className="font-medium">{context.referenceLabel}</span>
            </div>
            {billDetails?.customerName && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium">{billDetails.customerName}</span>
              </div>
            )}
          </div>

          {billDetails && <PaymentReceiptLineItems details={billDetails} currency={currency} />}

          <div className="border-t border-dashed border-gray-300 pt-2 mb-2 space-y-0.5 text-xs">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Payment summary</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Total bill</span>
              <span>{formatCurrency(context.totalBill, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Previously paid</span>
              <span>{formatCurrency(context.previousPaid, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>This payment</span>
              <span className="tabular-nums">{formatCurrency(payment.amount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total paid to date</span>
              <span className="tabular-nums">{formatCurrency(context.totalPaid, currency)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
              <span className={payment.balance_after > 0 ? 'text-amber-700' : 'text-emerald-700'}>Balance remaining</span>
              <span className="tabular-nums">{formatCurrency(payment.balance_after, currency)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 mb-2 space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount tendered</span>
              <span className="tabular-nums">{formatCurrency(tendered, currency)}</span>
            </div>
            {change > 0.009 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Change given</span>
                <span className="text-green-600 font-medium tabular-nums">{formatCurrency(change, currency)}</span>
              </div>
            )}
          </div>

          {payment.notes && (
            <p className="text-xs text-gray-500 border-t border-dashed border-gray-300 pt-2 mb-2">
              Note: {payment.notes}
            </p>
          )}

          <div className="text-center text-xs mb-2">
            {payment.balance_after <= 0 ? (
              <span className="font-semibold uppercase tracking-wider text-green-600">Paid in full</span>
            ) : (
              <span className="font-semibold uppercase tracking-wider text-amber-600">Partial payment</span>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-3">
            {business?.receipt_footer || 'Thank you for your business!'}
          </div>
        </div>
      </div>
    );
  },
);

PaymentReceiptContent.displayName = 'PaymentReceiptContent';

export default PaymentReceiptContent;

export function buildPaymentReceiptContext(
  payment: Payment,
  referenceLabel: string,
  referenceType: 'Sale' | 'Invoice',
  totalBill: number,
  totalPaidOnPayable: number,
): PaymentReceiptContext {
  return {
    referenceLabel,
    referenceType,
    totalBill,
    previousPaid: Math.max(0, totalPaidOnPayable - payment.amount),
    totalPaid: totalPaidOnPayable,
  };
}

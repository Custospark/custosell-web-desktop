import { Package } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import {
  resolveBillTotal,
  resolveDisplaySubtotal,
  shouldShowTaxLine,
  taxLineLabel,
} from '../../shared/utils/receiptTotals';
import type { PaymentReceiptBillDetails } from './paymentReceiptDetails';

interface PaymentReceiptLineItemsProps {
  details: PaymentReceiptBillDetails;
  currency?: string;
}

export default function PaymentReceiptLineItems({ details, currency = 'UGX' }: PaymentReceiptLineItemsProps) {
  if (details.lineItems.length === 0) return null;

  const billTotal = resolveBillTotal(details);
  const subtotal = resolveDisplaySubtotal(details);
  const showTax = shouldShowTaxLine(details, billTotal);

  return (
    <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
        <Package className="w-3 h-3" />
        Items purchased
      </div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-gray-300 text-gray-500">
            <th className="text-left pb-1 font-medium">Item</th>
            <th className="text-center pb-1 font-medium px-1">Qty</th>
            <th className="text-right pb-1 font-medium px-1">Price</th>
            <th className="text-right pb-1 font-medium pl-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {details.lineItems.map((item, i) => (
            <tr key={i} className="border-b border-dashed border-gray-200 last:border-0">
              <td className="py-1 text-gray-800 pr-1">
                <span className="break-words">{item.name}</span>
                {(item.refundedQuantity ?? 0) > 0 && (
                  <span className="block text-[10px] text-red-500">({item.refundedQuantity} refunded)</span>
                )}
                {(item.discount ?? 0) > 0 && (
                  <span className="block text-[10px] text-emerald-600">Disc. -{formatCurrency(item.discount!, currency)}</span>
                )}
              </td>
              <td className="py-1 text-center text-gray-700 tabular-nums px-1">{item.quantity}</td>
              <td className="py-1 text-right text-gray-700 tabular-nums px-1 whitespace-nowrap">
                {formatCurrency(item.unitPrice, currency)}
              </td>
              <td className="py-1 text-right text-gray-800 tabular-nums whitespace-nowrap">
                {formatCurrency(item.subtotal, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        {details.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Discount</span>
            <span className="text-emerald-600">-{formatCurrency(details.discount, currency)}</span>
          </div>
        )}
        {showTax && (
          <div className="flex justify-between">
            <span className="text-gray-500">{taxLineLabel(details, billTotal)}</span>
            <span>{formatCurrency(details.taxTotal, currency)}</span>
          </div>
        )}
        {details.totalRefunded > 0 && (
          <div className="flex justify-between">
            <span className="text-red-600">Refunded</span>
            <span className="text-red-600">-{formatCurrency(details.totalRefunded, currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
          <span className="text-gray-900">TOTAL</span>
          <span>{formatCurrency(billTotal, currency)}</span>
        </div>
      </div>
    </div>
  );
}

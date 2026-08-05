import React from 'react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cleanProductName } from '../../../shared/utils/cleanProductName';
import type { Sale } from '../api/salesTypes';

interface PrintableReceiptProps {
  sale: Sale;
  isPrinting: boolean;
}

const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(({ sale, isPrinting }, ref) => {
  const authUser = useAppSelector((s) => s.auth.user);
  const business = sale.business ?? authUser?.business;
  const cashierName = sale.user?.name;
  const customer = sale.customer;
  const currency = business?.currency || 'UGX';
  const paidAmount = parseFloat(sale.total_amount);
  const tendered = sale.amount_tendered ? parseFloat(sale.amount_tendered) : null;
  const change = sale.change_given ? parseFloat(sale.change_given) : null;
  const discount = parseFloat(sale.discount_amount);
  const totalRefunded = (sale.sale_items ?? []).reduce((sum, i) => sum + parseFloat(i.refunded_amount || '0'), 0);
  const netAmount = Math.max(0, Math.round((paidAmount - totalRefunded) * 100) / 100);
  const location = [business?.address, business?.city || business?.state, business?.country].filter(Boolean).join(', ');
  const timezone = business?.timezone || undefined;
  const shopPhone = business?.business_phone || business?.phone
    || (sale.business ? undefined : authUser?.phone);
  const shopName = business?.name?.trim() || 'Shop';

  return (
    <div className={isPrinting ? '' : 'hidden'}>
      <div ref={ref} className="receipt-print bg-white p-4 sm:p-6 max-w-sm mx-auto print:shadow-none">
        <style>{`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="text-center mb-3">
          <h2 className="text-lg font-bold text-gray-900 uppercase">{shopName.toUpperCase()}</h2>
          {business?.description && <p className="text-xs text-gray-500 mt-0.5">{business.description}</p>}
          {shopPhone ? (
            <p className="text-xs text-gray-500 mt-0.5">Call/WhatsApp: {shopPhone}</p>
          ) : null}
          {business?.business_email && <p className="text-xs text-gray-500">{business.business_email}</p>}
          {location && <p className="text-xs text-gray-400 mt-0.5">{location}</p>}
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1.5">Sales Receipt</p>
        </div>

        <div className="border-t border-dashed border-gray-400 border-b py-2 mb-3 text-xs text-gray-600 space-y-0.5">
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span className="font-medium text-gray-800">{sale.receipt_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span>{new Date(sale.created_at).toLocaleDateString(timezone ? undefined : 'en-UG', { timeZone: timezone })} {new Date(sale.created_at).toLocaleTimeString(timezone ? undefined : 'en-UG', { timeZone: timezone })}</span>
          </div>
          <div className="flex justify-between">
            <span>Sales Person</span>
            <span>{cashierName || '—'}</span>
          </div>
          {customer && (
            <div className="flex justify-between">
              <span>Customer</span>
              <span>{customer.name}{customer.phone ? ` (${customer.phone})` : ''}</span>
            </div>
          )}
        </div>

        <table className="w-full text-xs mb-3">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left pb-1 font-semibold text-gray-700 pr-2">Item</th>
              <th className="text-center pb-1 font-semibold text-gray-700 px-2">Qty</th>
              <th className="text-right pb-1 font-semibold text-gray-700 px-2">Price ({currency})</th>
              <th className="text-right pb-1 font-semibold text-gray-700 pl-2">Total ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {(sale.sale_items ?? []).map((item, i) => {
              const refunded = item.refunded_quantity > 0;
              return (
                <tr key={item.id} className={i < (sale.sale_items?.length ?? 0) - 1 ? 'border-b border-dashed border-gray-300' : ''}>
                  <td className="py-1 text-gray-800 pr-2 break-words">
                    <span>{cleanProductName(item.product_name)}</span>
                    {refunded && <span className="ml-1.5 text-xs text-red-500">({item.refunded_quantity} refunded)</span>}
                  </td>
                  <td className="py-1 text-center text-gray-800 px-2 whitespace-nowrap">{item.quantity}</td>
                  <td className="py-1 text-right text-gray-800 px-2 whitespace-nowrap">{parseFloat(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1 text-right text-gray-800 pl-2 whitespace-nowrap">{parseFloat(item.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">{formatCurrency(parseFloat(sale.subtotal))}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600">-{formatCurrency(discount)}</span>
            </div>
          )}
          {parseFloat(sale.tax_total || '0') > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">VAT</span>
              <span className="text-gray-700">{formatCurrency(parseFloat(sale.tax_total))}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
            <span className="text-gray-900">TOTAL</span>
            <span className="text-gray-900">{formatCurrency(paidAmount)}</span>
          </div>
        </div>

        {totalRefunded > 0.005 && (
          <div className="border-t border-dashed border-red-300 pt-2 mb-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-red-600 font-medium">Total Refunded</span>
              <span className="text-red-600">-{formatCurrency(totalRefunded)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-1">
              <span className="text-gray-900">Net Total</span>
              <span className="text-gray-900">{formatCurrency(netAmount)}</span>
            </div>
          </div>
        )}

        <div className="border-t border-dashed border-gray-300 pt-2 mb-2 text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Method</span>
            <span className="capitalize font-medium text-gray-800">{sale.payment_method.replace('_', ' ')}</span>
          </div>
          {tendered !== null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Tendered</span>
              <span className="text-gray-800">{formatCurrency(tendered)}</span>
            </div>
          )}
          {change !== null && change > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Change Given</span>
              <span className="text-green-600 font-medium">{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        <div className="text-center text-xs mb-3">
          {sale.payment_status === 'refunded' ? (
            <span className="font-semibold uppercase tracking-wider text-red-500">Full Refund</span>
          ) : sale.payment_status === 'partially_refunded' ? (
            <span className="font-semibold uppercase tracking-wider text-amber-500">Partially Refunded</span>
          ) : (
            <span className="font-semibold uppercase tracking-wider text-green-600">Paid</span>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-3">
          {business?.receipt_footer ? (
            <p>{business.receipt_footer}</p>
          ) : (
            <p>Thank you for your purchase!</p>
          )}
        </div>
      </div>
    </div>
  );
});

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;

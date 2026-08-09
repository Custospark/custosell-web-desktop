import { forwardRef } from 'react';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cleanProductName } from '../../../../shared/utils/cleanProductName';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import type { Sale } from '../../api/salesTypes';

interface ReceiptContentProps {
  sale: Sale;
}

const ReceiptContent = forwardRef<HTMLDivElement, ReceiptContentProps>(({ sale }, ref) => {
  const authUser = useAppSelector((s) => s.auth.user);
  // Letterhead = issuing shop on the sale. Never prefer the viewer's business
  // (Discover buyers / multi-shop owners must not see Custosell or their own brand).
  const business = sale.business ?? authUser?.business;
  const cashierName = sale.user?.name;
  const customer = sale.customer;
  const currency = business?.currency || 'UGX';
  const discount = parseFloat(sale.discount_amount);
  const taxTotal = parseFloat(sale.tax_total || '0');
  const subtotalBeforeDiscount = Math.max(0, parseFloat(sale.subtotal) + discount);
  const saleItems = sale.sale_items ?? [];
  // Re-flow each line: unit_price × qty − per-line discount (before the global checkout discount).
  const lineTotal = (item: Sale['sale_items'][number]) =>
    Math.max(0, parseFloat(item.unit_price) * item.quantity - parseFloat(item.discount_amount ?? '0'));
  const linesTotal = saleItems.reduce((sum, i) => sum + lineTotal(i), 0);
  const subtotalRow = linesTotal > 0 ? linesTotal : subtotalBeforeDiscount;
  const totalRefunded = saleItems.reduce((sum, i) => sum + parseFloat(i.refunded_amount || '0'), 0);
  const netAmount = Math.max(0, Math.round((parseFloat(sale.total_amount) - totalRefunded) * 100) / 100);
  const amountPaid = parseFloat(String(sale.amount_paid ?? sale.total_amount));
  const balanceDue = Math.max(0, netAmount - amountPaid);
  const payments = sale.payments ?? [];
  const isPartiallyPaid = sale.payment_status === 'partially_paid' || balanceDue > 0.009;
  const tenderedRaw = sale.amount_tendered ? parseFloat(sale.amount_tendered) : null;
  const changeRaw = sale.change_given ? parseFloat(sale.change_given) : null;
  const hasInstallments = payments.length > 0;
  const displayTendered = hasInstallments
    ? (payments[0]?.amount_tendered ?? payments[0]?.amount ?? tenderedRaw)
    : (isPartiallyPaid && tenderedRaw != null ? Math.min(tenderedRaw, amountPaid) : tenderedRaw);
  const displayChange = hasInstallments
    ? (payments[0]?.change_given ?? changeRaw)
    : changeRaw;
  const location = [business?.address, business?.city || business?.state, business?.country].filter(Boolean).join(', ');
  const shopPhone = business?.business_phone || business?.phone
    || (sale.business ? undefined : authUser?.phone);
  const shopName = business?.name?.trim() || 'Shop';

  return (
    <div ref={ref} className="receipt-print bg-white border border-gray-200 rounded-xl print:border-0 print:rounded-none print:bg-transparent print:shadow-none text-xs shadow-[0_2px_10px_rgba(0,0,0,0.06)]" style={{ maxWidth: '320px' }}>
      <style>{`
        @media print {
          .receipt-print { max-width: 100% !important; width: 100%; border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="p-4 print:px-2 print:py-3">
        <div className="text-center mb-3">
          <h2 className="text-base font-bold text-gray-900 uppercase">{shopName.toUpperCase()}</h2>
          {business?.description && <p className="text-xs text-gray-500 mt-0.5">{business.description}</p>}
          {shopPhone ? (
            <p className="text-xs text-gray-500 mt-0.5">Call/WhatsApp: {shopPhone}</p>
          ) : null}
          {business?.business_email && <p className="text-xs text-gray-500">{business.business_email}</p>}
          {location && <p className="text-xs text-gray-400 mt-0.5">{location}</p>}
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1.5">Sales Receipt</p>
        </div>

        <div className="border-t border-gray-200 border-b pb-2 mb-3 text-xs text-gray-600 space-y-0.5">
          <div className="flex justify-between">
            <span>Receipt Number</span>
            <span className="font-medium text-gray-800">{sale.receipt_number}</span>
          </div>
          {sale.location?.name && (
            <div className="flex justify-between">
              <span>Branch</span>
              <span className="font-medium text-gray-800">{sale.location.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Date</span>
            <span>{new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}</span>
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
              const unit = parseFloat(item.unit_price);
              const lineDiscount = parseFloat(item.discount_amount ?? '0');
              return (
                <tr key={item.id} className={i < (sale.sale_items?.length ?? 0) - 1 ? 'border-b border-dashed border-gray-300' : ''}>
                  <td className="py-1 text-gray-800 pr-2 break-words">
                    <span>{cleanProductName(item.product_name)}</span>
                    {refunded && (
                      <span className="block ml-0 text-[10px] text-red-500">
                        {item.refunded_quantity} refunded −{parseFloat(item.refunded_amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {lineDiscount > 0 && (
                      <span className="block text-[10px] text-green-600">
                        Disc −{lineDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-center text-gray-800 px-2 whitespace-nowrap">{item.quantity}</td>
                  <td className="py-1 text-right text-gray-800 px-2 whitespace-nowrap">
                    <span>{unit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="py-1 text-right text-gray-800 pl-2 whitespace-nowrap">{lineTotal(item).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">{formatCurrency(subtotalRow)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600">-{formatCurrency(discount)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">VAT</span>
              <span className="text-gray-700">{formatCurrency(taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
            <span className="text-gray-900">TOTAL</span>
            <span className="text-gray-900">{formatCurrency(parseFloat(sale.total_amount))}</span>
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
          {displayTendered !== null && displayTendered > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Tendered</span>
              <span className="text-gray-800">{formatCurrency(displayTendered)}</span>
            </div>
          )}
          {displayChange !== null && displayChange > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Change Given</span>
              <span className="text-green-600 font-medium">{formatCurrency(displayChange)}</span>
            </div>
          )}
          {hasInstallments && payments.length > 1 && (
            <div className="pt-1 mt-1 border-t border-dashed border-gray-200 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Installments ({payments.length})</p>
              {payments.map((p, i) => (
                <div key={p.id} className="flex justify-between text-[11px]">
                  <span className="text-gray-500">#{i + 1} {p.receipt_number}</span>
                  <span className="text-emerald-700 tabular-nums">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {isPartiallyPaid && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="text-emerald-700 font-medium">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance Due</span>
                <span className="text-amber-700 font-bold">{formatCurrency(balanceDue)}</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-xs mb-3">
          {sale.payment_status === 'refunded' ? (
            <span className="font-semibold uppercase tracking-wider text-red-500">Full Refund</span>
          ) : sale.payment_status === 'partially_refunded' ? (
            <span className="font-semibold uppercase tracking-wider text-amber-500">Partially Refunded</span>
          ) : isPartiallyPaid ? (
            <span className="font-semibold uppercase tracking-wider text-amber-600">Partially Paid</span>
          ) : (
            <span className="font-semibold uppercase tracking-wider text-green-600">Paid</span>
          )}
        </div>

        {sale.fiscal_status === 'fiscalized' && (sale.fiscal_fdn || sale.fiscal_qr || sale.fiscal_verification_code) ? (
          <div className="text-center text-xs border-t border-dashed border-gray-300 pt-3 mb-3 space-y-1">
            <p className="font-semibold uppercase tracking-wider text-gray-700">EFRIS</p>
            {sale.fiscal_fdn ? (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">FDN</span>
                <span className="font-medium text-gray-800 break-all">{sale.fiscal_fdn}</span>
              </div>
            ) : null}
            {sale.fiscal_verification_code ? (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Code</span>
                <span className="font-medium text-gray-800 break-all">{sale.fiscal_verification_code}</span>
              </div>
            ) : null}
            {sale.fiscal_qr ? (
              <p className="text-[10px] text-gray-500 break-all mt-1">QR: {sale.fiscal_qr}</p>
            ) : null}
          </div>
        ) : null}

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

ReceiptContent.displayName = 'ReceiptContent';

export default ReceiptContent;

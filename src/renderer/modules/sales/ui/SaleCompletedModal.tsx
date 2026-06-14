import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  onNewSale: () => void;
}

export default function SaleCompletedModal({ sale, onNewSale }: SaleCompletedModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business ?? sale?.business;

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale?.receipt_number ?? 'receipt',
    pageStyle: `
      @page { margin: 8mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
        .no-print { display: none !important; }
      }
    `,
  });

  if (!sale) return null;

  const cashierName = sale.user?.name;
  const customer = sale.customer;
  const currency = business?.currency || 'UGX';
  const tendered = sale.amount_tendered ? parseFloat(sale.amount_tendered) : null;
  const change = sale.change_given ? parseFloat(sale.change_given) : null;
  const discount = parseFloat(sale.discount_amount);
  const taxTotal = parseFloat(sale.tax_total || '0');
  const totalRefunded = (sale.sale_items ?? []).reduce((sum, i) => sum + parseFloat(i.refunded_amount || '0'), 0);
  const netAmount = Math.max(0, Math.round((parseFloat(sale.total_amount) - totalRefunded) * 100) / 100);
  const location = [business?.address, business?.city, business?.state, business?.country].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full p-6 sm:p-8 flex flex-col" style={{ maxWidth: '480px' }}>
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center mb-4">Sale Completed</h2>

        {sale._pendingSync && (
          <p className="text-xs text-amber-600 font-medium text-center mb-4">
            Saved locally — will sync when you&apos;re back online
          </p>
        )}

        <div ref={receiptRef} className="receipt-print bg-white p-4 border border-gray-200 rounded-xl text-xs">
          <div className="text-center mb-3">
            <h2 className="text-base font-bold text-gray-900 uppercase">{business?.name?.toUpperCase() || 'CUSTOSELL'}</h2>
            {location && <p className="text-xs text-gray-500">{location}</p>}
            <div className="text-xs text-gray-400 space-x-2 mt-0.5">
              {business?.phone && <span>Tel: {business.phone}</span>}
              {business?.email && <span>| {business.email}</span>}
            </div>
            {business?.website && <p className="text-xs text-gray-400">{business.website}</p>}
            {business?.tax_id && <p className="text-xs text-gray-400">Tax ID: {business.tax_id}</p>}
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Point of Sale Receipt</p>
          </div>

          <div className="border-t border-dashed border-gray-400 border-b py-2 mb-3 text-xs text-gray-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Receipt #</span>
              <span className="font-medium text-gray-800">{sale.receipt_number}</span>
            </div>
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
                <th className="text-left pb-1 font-semibold text-gray-700">Item</th>
                <th className="text-center pb-1 font-semibold text-gray-700">Qty</th>
                <th className="text-right pb-1 font-semibold text-gray-700">Price ({currency})</th>
                <th className="text-right pb-1 font-semibold text-gray-700">Total ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {(sale.sale_items ?? []).map((item, i) => {
                const refunded = item.refunded_quantity > 0;
                return (
                  <tr key={item.id} className={i < (sale.sale_items?.length ?? 0) - 1 ? 'border-b border-dashed border-gray-300' : ''}>
                    <td className="py-1 text-gray-800">
                      <span>{item.product_name}</span>
                      {refunded && <span className="ml-1.5 text-xs text-red-500">({item.refunded_quantity} refunded)</span>}
                    </td>
                    <td className="py-1 text-center text-gray-800">{item.quantity}</td>
                    <td className="py-1 text-right text-gray-800">{parseFloat(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 text-right text-gray-800">{parseFloat(item.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
            {tendered !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Tendered</span>
                <span className="text-gray-800">{formatCurrency(tendered)}</span>
              </div>
            )}
            {change !== null && change > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Change</span>
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

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button className="flex-1 order-2 sm:order-1 py-3" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            Print Receipt
          </Button>
          <Button className="flex-1 order-1 sm:order-2 py-3" onClick={onNewSale}>
            <Plus className="w-4 h-4 mr-1" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

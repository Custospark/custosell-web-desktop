import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Printer, Plus } from 'lucide-react';

interface Props {
  receiptNumber: string;
  onNewSale: () => void;
}

export default function ReceiptView({ receiptNumber, onNewSale }: Props) {
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const business = useAppSelector((s) => s.auth.user?.business);
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });
  const location = [business?.address, business?.city, business?.state, business?.country].filter(Boolean).join(', ');

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Receipt */}
      <div className="flex-1 flex items-start justify-center pt-8">
        <div ref={receiptRef} className="bg-white p-6 border border-gray-200 rounded-xl w-full max-w-sm">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">{business?.name?.toUpperCase() || 'CUSTOSELL'}</h2>
            {location && <p className="text-xs text-gray-500">{location}</p>}
            <div className="text-xs text-gray-400 space-x-2 mt-0.5">
              {business?.phone && <span>Tel: {business.phone}</span>}
              {business?.email && <span>| {business.email}</span>}
            </div>
            {business?.website && <p className="text-xs text-gray-400">{business.website}</p>}
            {business?.tax_id && <p className="text-xs text-gray-400">Tax ID: {business.tax_id}</p>}
            <p className="text-xs text-gray-400 mt-1">Receipt: {receiptNumber}</p>
          </div>

          <div className="space-y-2 text-sm">
            {cartItems.map((item, i) => (
              <div key={i} className="flex justify-between">
                <div className="flex-1">
                  <p className="text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
              <span>Total</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 pt-1">
              <span>Paid via</span><span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="w-72 flex flex-col items-center justify-center gap-4">
        <Button className="w-full" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1.5" />Print Receipt
        </Button>
        <Button variant="outline" className="w-full" onClick={onNewSale}>
          <Plus className="w-4 h-4 mr-1.5" />New Sale
        </Button>
      </div>
    </div>
  );
}

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
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business;
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });
  const location = [business?.address, business?.city || business?.state, business?.country].filter(Boolean).join(', ');

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-y-auto">
      {/* Left: Receipt */}
      <div className="flex-1 flex items-start justify-center pt-4 lg:pt-8">
        <div ref={receiptRef} className="bg-white p-4 sm:p-6 border border-gray-200 rounded-xl w-full max-w-sm">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">{business?.name?.toUpperCase() || 'CUSTOSELL'}</h2>
            {business?.description && <p className="text-xs text-gray-500 mt-0.5">{business.description}</p>}
            {(business?.business_phone || business?.phone || authUser?.phone) && (
              <p className="text-xs text-gray-500 mt-0.5">Call/WhatsApp: {business?.business_phone || business?.phone || authUser?.phone}</p>
            )}
            {business?.business_email && <p className="text-xs text-gray-500">{business.business_email}</p>}
            {location && <p className="text-xs text-gray-400 mt-0.5">{location}</p>}
            <p className="text-xs text-gray-400 mt-1.5">Receipt: {receiptNumber}</p>
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
      <div className="w-full lg:w-72 flex flex-row lg:flex-col items-center justify-center gap-3 lg:gap-4 px-4 lg:px-0 pb-4 lg:pb-0">
        <Button size="sm" className="lg:w-full flex-1 lg:flex-none" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1.5" />Print Receipt
        </Button>
        <Button variant="outline" size="sm" className="lg:w-full flex-1 lg:flex-none" onClick={onNewSale}>
          <Plus className="w-4 h-4 mr-1.5" />New Sale
        </Button>
      </div>
    </div>
  );
}

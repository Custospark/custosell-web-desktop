import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { CartItem } from '../../api/salesTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Button } from '../../../../shared/components/buttons/Button';
import { Printer, Plus } from 'lucide-react';

interface ReceiptPreviewProps {
  receiptNumber: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  onClose: () => void;
  onNewSale: () => void;
}

export default function ReceiptPreview({ receiptNumber, items, total, paymentMethod, onNewSale }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div ref={receiptRef} className="bg-white p-6 border border-gray-200 rounded-xl">
        <div className="text-center border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Custosell</h2>
          <p className="text-xs text-gray-500">Point of Sale</p>
          <p className="text-xs text-gray-400 mt-1">Receipt: {receiptNumber}</p>
        </div>

        <div className="space-y-2 text-sm">
          {items.map((item, i) => (
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
            <span>Subtotal</span><span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Paid via</span><span className="capitalize">{paymentMethod}</span>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
          <p>Thank you for your purchase!</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1.5" />Print
        </Button>
        <Button className="flex-1" onClick={onNewSale}>
          <Plus className="w-4 h-4 mr-1.5" />New Sale
        </Button>
      </div>
    </div>
  );
}

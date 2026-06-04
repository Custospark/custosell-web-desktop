import { CheckCircle, Printer } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import type { Sale } from '../api/salesTypes';

interface SaleCompletedModalProps {
  sale: Sale | null;
  onClose: () => void;
  onPrint: () => void;
  onNewSale: () => void;
}

export default function SaleCompletedModal({ sale, onClose, onPrint, onNewSale }: SaleCompletedModalProps) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 sm:p-10 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Sale Completed</h2>
        <p className="text-sm text-gray-500 mb-6">Receipt Number: {sale.receipt_number}</p>
        <div className="text-left bg-gray-50 rounded-xl p-5 mb-6 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Items</span>
            <span className="font-medium text-gray-900">{sale.sale_items?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(sale.total_amount))}</span>
          </div>
          {parseFloat(sale.discount_amount) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600">-{formatCurrency(parseFloat(sale.discount_amount))}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Payment</span>
            <span className="capitalize font-medium text-gray-900">{sale.payment_method.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 order-2 sm:order-1" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 order-3 sm:order-2" variant="outline" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-1" />
            Print Receipt
          </Button>
          <Button className="flex-1 order-1 sm:order-3" onClick={onNewSale}>
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

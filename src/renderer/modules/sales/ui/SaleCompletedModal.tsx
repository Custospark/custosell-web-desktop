import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle, X, FileText } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import ReceiptContent from './receipt/ReceiptContent';
import PaymentReceiptModal from '../../payments/PaymentReceiptModal';
import type { Payment } from '../../payments/paymentTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { netSaleAmount } from '../utils/saleAmounts';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  lastPayment?: Payment | null;
  onNewSale: () => void;
  onClose?: () => void;
}

export default function SaleCompletedModal({ sale, lastPayment, onNewSale, onClose }: SaleCompletedModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale?.receipt_number ?? 'receipt',
    pageStyle: `
      @page { margin: 0; }
      @media print {
        html, body { margin: 0; padding: 0; width: auto; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
        .no-print { display: none !important; }
      }
    `,
  });

  if (!sale) return null;

  const amountPaid = parseFloat(String(sale.amount_paid ?? sale.total_amount));
  const totalAmount = netSaleAmount(sale);
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const isPartial = sale.payment_status === 'partially_paid' || balanceDue > 0.009;

  if (showPaymentReceipt && lastPayment) {
    return (
      <PaymentReceiptModal
        payment={lastPayment}
        referenceLabel={sale.receipt_number}
        referenceType="Sale"
        totalBill={totalAmount}
        totalPaidOnPayable={amountPaid}
        onClose={() => { setShowPaymentReceipt(false); onNewSale(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full p-4 sm:p-6 lg:p-8 flex flex-col relative" style={{ maxWidth: '480px' }}>
        <button
          type="button"
          onClick={onClose ?? onNewSale}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1">
          {isPartial ? 'Partial payment recorded' : 'Sale completed'}
        </h2>
        {isPartial && (
          <p className="text-sm text-center text-amber-700 mb-3 tabular-nums">
            {formatCurrency(amountPaid)} paid · {formatCurrency(balanceDue)} remaining
          </p>
        )}

        {sale._pendingSync && (
          <p className="text-xs text-amber-600 font-medium text-center mb-3 sm:mb-4">
            Saved locally — will sync when you&apos;re back online
          </p>
        )}

        <div className="flex justify-center overflow-x-auto">
          <ReceiptContent ref={receiptRef} sale={sale} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
          {lastPayment && (
            <Button className="flex-1 py-2.5 sm:py-3" variant="outline" onClick={() => setShowPaymentReceipt(true)}>
              <FileText className="w-4 h-4 mr-1" />
              Payment receipt
            </Button>
          )}
          <Button className="flex-1 py-2.5 sm:py-3" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            {isPartial ? 'Sale summary' : 'Print receipt'}
          </Button>
          <Button className="flex-1 py-2.5 sm:py-3" onClick={onNewSale}>
            <Plus className="w-4 h-4 mr-1" />
            New sale
          </Button>
        </div>
      </div>
    </div>
  );
}

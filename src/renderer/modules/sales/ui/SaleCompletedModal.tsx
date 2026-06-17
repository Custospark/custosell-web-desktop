import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, CheckCircle } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import ReceiptContent from './receipt/ReceiptContent';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';

interface SaleCompletedModalProps {
  sale: SaleWithSyncMeta | null;
  onNewSale: () => void;
}

export default function SaleCompletedModal({ sale, onNewSale }: SaleCompletedModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col" style={{ maxWidth: '480px' }}>
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Sale Completed</h2>

        {sale._pendingSync && (
          <p className="text-xs text-amber-600 font-medium text-center mb-3 sm:mb-4">
            Saved locally — will sync when you&apos;re back online
          </p>
        )}

        <div className="flex justify-center overflow-x-auto">
          <ReceiptContent ref={receiptRef} sale={sale} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
          <Button className="flex-1 order-2 sm:order-1 py-2.5 sm:py-3" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            Print Receipt
          </Button>
          <Button className="flex-1 order-1 sm:order-2 py-2.5 sm:py-3" onClick={onNewSale}>
            <Plus className="w-4 h-4 mr-1" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      @page { margin: 8mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
        .no-print { display: none !important; }
      }
    `,
  });

  if (!sale) return null;

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

        <ReceiptContent ref={receiptRef} sale={sale} />

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

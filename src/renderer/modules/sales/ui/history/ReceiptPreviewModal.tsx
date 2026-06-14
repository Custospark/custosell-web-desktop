import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Eye } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import ReceiptContent from '../receipt/ReceiptContent';
import type { Sale } from '../../api/salesTypes';

interface ReceiptPreviewModalProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ sale, open, onClose }: ReceiptPreviewModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale.receipt_number,
    pageStyle: `
      @page { margin: 8mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
        .no-print { display: none !important; }
      }
    `,
  });

  return (
    <Modal isOpen={open} onClose={onClose} title="Receipt Preview" size="sm">
      <div className="no-print flex justify-end mb-4">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" />
          Print Receipt
        </Button>
      </div>

      <ReceiptContent ref={receiptRef} sale={sale} />

      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100 no-print">
        <Eye className="w-4 h-4 text-gray-400" />
        <p className="text-xs text-gray-400">This receipt matches the printed version</p>
      </div>
    </Modal>
  );
}

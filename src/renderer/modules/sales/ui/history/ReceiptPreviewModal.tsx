import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
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
      @page { margin: 0; }
      @media print {
        html, body { margin: 0; padding: 0; width: auto; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
        .no-print { display: none !important; }
      }
    `,
  });

  return (
    <Modal isOpen={open} onClose={onClose} title="Receipt Preview" size="sm">
      <div className="no-print flex justify-end mb-3 sm:mb-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Print Receipt</span>
        </Button>
      </div>

      <ReceiptContent ref={receiptRef} sale={sale} />
    </Modal>
  );
}

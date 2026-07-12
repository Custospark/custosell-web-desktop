import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Share2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import ReceiptContent from '../receipt/ReceiptContent';
import { useWebShare, receiptShareText } from '../../../../shared/hooks/useWebShare';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import type { Sale } from '../../api/salesTypes';

interface ReceiptPreviewModalProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ sale, open, onClose }: ReceiptPreviewModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business ?? sale.business;
  const { share } = useWebShare();

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

  const handleDownloadPdf = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: sale.receipt_number,
    pageStyle: `
      @page { margin: 0; size: auto; }
      @media print {
        html, body { margin: 0; padding: 0; width: auto; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
        .no-print { display: none !important; }
      }
    `,
  });

  const shopName = business?.name ?? 'Shop';
  const currency = business?.currency || 'UGX';

  return (
    <Modal isOpen={open} onClose={onClose} title="Receipt Preview" size="sm">
      <div className="no-print flex flex-wrap gap-2 justify-end mb-3 sm:mb-4">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void share({
            title: `Receipt ${sale.receipt_number}`,
            text: receiptShareText(
              shopName,
              sale.receipt_number,
              parseFloat(sale.total_amount),
              currency,
              sale.payment_method,
            ),
          })}
        >
          <Share2 className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Print Receipt</span>
        </Button>
      </div>

      <ReceiptContent ref={receiptRef} sale={sale} />
    </Modal>
  );
}

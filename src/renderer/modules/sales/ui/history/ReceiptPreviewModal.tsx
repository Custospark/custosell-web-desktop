import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Share2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import ReceiptContent from '../receipt/ReceiptContent';
import { ReceiptActionBar } from '../receipt/ReceiptActionBar';
import { useWebShare, receiptShareText } from '../../../../shared/hooks/useWebShare';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import type { Sale } from '../../api/salesTypes';

interface ReceiptPreviewModalProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

/** Receipt preview — Sale completed action layout (Download / Print / More → Share). */
export default function ReceiptPreviewModal({ sale, open, onClose }: ReceiptPreviewModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = sale.business ?? authUser?.business;
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
      <div className="flex justify-center overflow-x-auto">
        <ReceiptContent ref={receiptRef} sale={sale} />
      </div>

      <ReceiptActionBar
        className="mt-4"
        actions={[
          {
            key: 'pdf',
            label: 'Download PDF',
            icon: <Download className="h-4 w-4" />,
            onClick: handleDownloadPdf,
            title: 'Save this receipt as a PDF file',
          },
          {
            key: 'print',
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            onClick: handlePrint,
            title: 'Print a paper copy of this receipt',
          },
        ]}
        moreActions={[
          {
            key: 'share',
            label: 'Share',
            icon: <Share2 className="h-4 w-4" />,
            onClick: () => {
              void share({
                title: `Receipt ${sale.receipt_number}`,
                text: receiptShareText(
                  shopName,
                  sale.receipt_number,
                  parseFloat(sale.total_amount),
                  currency,
                  sale.payment_method,
                ),
              });
            },
          },
        ]}
      />
    </Modal>
  );
}

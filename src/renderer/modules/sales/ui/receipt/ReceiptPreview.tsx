import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { CartItem } from '../../api/salesTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { Printer, Plus, Download, Share2 } from 'lucide-react';
import { useWebShare, receiptShareText } from '../../../../shared/hooks/useWebShare';
import { ReceiptActionBar } from './ReceiptActionBar';

interface ReceiptPreviewProps {
  receiptNumber: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  onClose?: () => void;
  onNewSale: () => void;
}

/** Legacy cart receipt preview — same action layout as Sale completed. */
export default function ReceiptPreview({ receiptNumber, items, total, paymentMethod, onNewSale }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business;
  const { share } = useWebShare();
  const handlePrint = useReactToPrint({ contentRef: receiptRef });
  const handleDownloadPdf = useReactToPrint({ contentRef: receiptRef, documentTitle: receiptNumber });
  const location = [business?.address, business?.city || business?.state, business?.country].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div ref={receiptRef} className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 border-b border-gray-200 pb-4 text-center">
          <h2 className="text-lg font-bold text-gray-900">{business?.name?.toUpperCase() || 'CUSTOSELL'}</h2>
          {business?.description ? <p className="mt-0.5 text-xs text-gray-500">{business.description}</p> : null}
          {(business?.business_phone || business?.phone || authUser?.phone) ? (
            <p className="mt-0.5 text-xs text-gray-500">
              Call/WhatsApp: {business?.business_phone || business?.phone || authUser?.phone}
            </p>
          ) : null}
          {business?.business_email ? <p className="text-xs text-gray-500">{business.business_email}</p> : null}
          {location ? <p className="mt-0.5 text-xs text-gray-400">{location}</p> : null}
          <p className="mt-1.5 text-xs text-gray-400">Receipt: {receiptNumber}</p>
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

        <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
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

        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
          <p>Thank you for your purchase!</p>
        </div>
      </div>

      <ReceiptActionBar
        actions={[
          {
            key: 'pdf',
            label: 'Download PDF',
            icon: <Download className="h-4 w-4" />,
            onClick: handleDownloadPdf,
          },
          {
            key: 'print',
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            onClick: handlePrint,
          },
          {
            key: 'new',
            label: 'New sale',
            icon: <Plus className="h-4 w-4" />,
            onClick: onNewSale,
            primary: true,
          },
        ]}
        moreActions={[
          {
            key: 'share',
            label: 'Share',
            icon: <Share2 className="h-4 w-4" />,
            onClick: () => {
              void share({
                title: `Receipt ${receiptNumber}`,
                text: receiptShareText(
                  business?.name ?? 'Business',
                  receiptNumber,
                  total,
                  business?.currency || 'UGX',
                  paymentMethod,
                ),
              });
            },
          },
        ]}
      />
    </div>
  );
}

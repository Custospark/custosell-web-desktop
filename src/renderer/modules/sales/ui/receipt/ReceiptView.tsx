import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Printer, Plus, Download, Share2 } from 'lucide-react';
import { useWebShare, receiptShareText } from '../../../../shared/hooks/useWebShare';
import { ReceiptActionBar } from './ReceiptActionBar';

interface Props {
  receiptNumber: string;
  onNewSale: () => void;
}

/** Legacy full-page receipt view - same action layout as Sale completed. */
export default function ReceiptView({ receiptNumber, onNewSale }: Props) {
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business;
  const receiptRef = useRef<HTMLDivElement>(null);
  const { share } = useWebShare();
  const handlePrint = useReactToPrint({ contentRef: receiptRef });
  const handleDownloadPdf = useReactToPrint({ contentRef: receiptRef, documentTitle: receiptNumber });
  const location = [business?.address, business?.city || business?.state, business?.country].filter(Boolean).join(', ');
  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto lg:flex-row">
      <div className="flex flex-1 items-start justify-center pt-4 lg:pt-8">
        <div ref={receiptRef} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
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
            {cartItems.map((item, i) => (
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
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold text-gray-900">
              <span>Total</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between pt-1 text-xs text-gray-400">
              <span>Paid via</span><span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 pb-4 lg:w-72 lg:flex-col lg:px-0 lg:pb-0">
        <ReceiptActionBar
          className="w-full lg:flex-col lg:items-stretch"
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
                    subtotal,
                    business?.currency || 'UGX',
                    paymentMethod,
                  ),
                });
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

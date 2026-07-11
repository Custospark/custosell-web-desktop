import { Check } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { purchaseOrderStatusBadge } from './purchaseOrderBadges';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface ViewPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  role?: 'buyer' | 'seller';
}

const BUYER_ACTION: Record<string, string> = {
  draft: 'You can edit, submit, or delete this draft. The seller cannot see it until you submit.',
  submitted: 'Waiting for the seller to review. You can cancel if needed.',
  accepted: 'The seller accepted and created an invoice. Track payment under Invoices; await fulfillment.',
  rejected: 'The seller declined your order. You can delete it after reviewing their reason.',
  fulfilled: 'Items are ready. Confirm receipt to add them to your stock. Invoice and receipts are under Invoices.',
  received: 'Items are in your stock. Open Invoices for the linked invoice and payment receipts.',
  cancelled: 'This order was cancelled. You can delete it from your list.',
};

const SELLER_ACTION: Record<string, string> = {
  draft: 'Not visible yet — the buyer is still composing this order.',
  submitted: 'Review the order. Accepting creates an invoice for the buyer automatically.',
  accepted: 'Invoice created. Prepare and ship the items, then mark as fulfilled. Manage payments under Invoices.',
  rejected: 'You rejected this order. You can delete it from your list.',
  fulfilled: 'Stock deducted. Waiting for the buyer to confirm receipt. Payments stay under Invoices.',
  received: 'The buyer confirmed receipt. This order is complete — keep managing payment under Invoices.',
  cancelled: 'The buyer cancelled this order. You can delete it from your list.',
};

const STEP_ORDER = ['draft', 'submitted', 'accepted', 'fulfilled', 'received'] as const;

const STEP_LABELS: Record<string, string> = {
  draft: 'Created',
  submitted: 'Submitted',
  accepted: 'Accepted',
  fulfilled: 'Fulfilled',
  received: 'Received',
};

const STEP_DATE: Record<string, keyof PurchaseOrder> = {
  draft: 'created_at',
  submitted: 'submitted_at',
  accepted: 'accepted_at',
  fulfilled: 'fulfilled_at',
  received: 'received_at',
};

function toDateStr(val: unknown): string | null {
  if (typeof val === 'string') return val;
  return null;
}

function OrderStages({ po }: { po: PurchaseOrder }) {
  const statusRank: Record<string, number> = { draft: 0, submitted: 1, accepted: 2, fulfilled: 3, received: 4, rejected: -1, cancelled: -1 };
  const currentRank = statusRank[po.status] ?? -1;

  const isTerminal = po.status === 'rejected' || po.status === 'cancelled';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-0">
        {STEP_ORDER.map((step, i) => {
          const rank = statusRank[step];
          const completed = rank <= currentRank && !isTerminal;
          const isCurrent = rank === currentRank && !isTerminal;
          const date = toDateStr(po[STEP_DATE[step]]);

          return (
            <div key={step} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute top-3.5 right-1/2 h-0.5 w-full -z-10 ${completed ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10
                  ${isCurrent ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' : ''}
                  ${completed && !isCurrent ? 'bg-blue-600 border-blue-600 text-white' : ''}
                  ${!completed && !isCurrent ? 'bg-white border-gray-300 text-gray-400' : ''}
                `}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <p className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${isCurrent ? 'text-blue-700' : completed ? 'text-gray-700' : 'text-gray-400'}`}>
                {STEP_LABELS[step]}
              </p>
              {date && (
                <p className="text-[9px] text-gray-400 text-center leading-tight">{new Date(date).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
      </div>

      {isTerminal && (
        <div className="text-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            po.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {po.status === 'rejected' ? 'Rejected' : 'Cancelled'}
          </span>
        </div>
      )}
    </div>
  );
}

function RejectionBanner({ reason }: { reason: string }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
      <span className="font-medium">Rejected:</span> {reason}
    </div>
  );
}

export default function ViewPurchaseOrderModal({ purchaseOrder: po, isOpen, onClose, role = 'buyer' }: ViewPurchaseOrderModalProps) {
  const statusAction = role === 'seller' ? SELLER_ACTION : BUYER_ACTION;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="p-5 space-y-5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-gray-900">{po.po_number}</h2>
            {purchaseOrderStatusBadge(po.status)}
          </div>
            <div className="mt-3 text-sm sm:text-center">
              {role === 'buyer' && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Seller</p>
                  <p className="font-medium text-gray-900">{po.seller_business?.name ?? `Business #${po.seller_business_id}`}</p>
                  {po.seller_business?.description && (
                    <p className="text-gray-500 text-xs italic">{po.seller_business.description}</p>
                  )}
                  {po.seller_business?.business_phone && (
                    <p className="text-gray-600 text-xs">{po.seller_business.business_phone}</p>
                  )}
                  {po.seller_business?.business_email && (
                    <p className="text-gray-600 text-xs">{po.seller_business.business_email}</p>
                  )}
                  {(() => {
                    const parts = [po.seller_business?.address, po.seller_business?.city, po.seller_business?.state, po.seller_business?.country].filter(Boolean);
                    return parts.length > 0 ? <p className="text-gray-500 text-xs">{parts.join(', ')}</p> : null;
                  })()}
                </div>
              )}
              {role === 'seller' && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Buyer</p>
                  <p className="font-medium text-gray-900">{po.buyer_business?.name ?? `Business #${po.buyer_business_id}`}</p>
                  {po.buyer_business?.description && (
                    <p className="text-gray-500 text-xs italic">{po.buyer_business.description}</p>
                  )}
                  {po.buyer_business?.business_phone && (
                    <p className="text-gray-600 text-xs">{po.buyer_business.business_phone}</p>
                  )}
                  {po.buyer_business?.business_email && (
                    <p className="text-gray-600 text-xs">{po.buyer_business.business_email}</p>
                  )}
                  {(() => {
                    const parts = [po.buyer_business?.address, po.buyer_business?.city, po.buyer_business?.state, po.buyer_business?.country].filter(Boolean);
                    return parts.length > 0 ? <p className="text-gray-500 text-xs">{parts.join(', ')}</p> : null;
                  })()}
                </div>
              )}
            </div>
        </div>

        <OrderStages po={po} />

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm text-blue-800">{statusAction[po.status] ?? ''}</p>
        </div>

        {po.rejection_reason ? <RejectionBanner reason={po.rejection_reason} /> : null}

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</h3>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {(po.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                  {item.product_sku && <p className="text-xs text-gray-400">SKU: {item.product_sku}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-900">{item.quantity} × {formatCurrency(Number(item.unit_price))}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(Number(item.subtotal))}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <p className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(Number(po.total_amount))}
            </p>
          </div>
        </div>

        {po.notes && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{po.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

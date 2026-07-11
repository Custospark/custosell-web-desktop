import { Modal } from '../../../../shared/components/modals/Modal';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { purchaseOrderStatusBadge } from './purchaseOrderBadges';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface ViewPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_EXPLANATION: Record<string, { buyer: string; seller: string }> = {
  draft: {
    buyer: 'You can edit or submit this order. No action needed from the seller yet.',
    seller: 'Not visible to you yet. The buyer is still composing this order.',
  },
  submitted: {
    buyer: 'Waiting for the seller to respond. You can cancel if needed.',
    seller: 'Review the order details. You can accept or reject it.',
  },
  accepted: {
    buyer: 'The seller has accepted your order. Awaiting fulfillment.',
    seller: 'You have accepted this order. Prepare the items for fulfillment.',
  },
  rejected: {
    buyer: 'The seller declined your order. Check the reason provided.',
    seller: 'You rejected this order. The buyer can see your reason.',
  },
  fulfilled: {
    buyer: 'The seller has shipped/prepared the items. Confirm receipt to add to your stock.',
    seller: 'Items deducted from your stock. Waiting for the buyer to confirm receipt.',
  },
  received: {
    buyer: 'Items added to your stock. You can generate an invoice from this order.',
    seller: 'The buyer confirmed receipt. This order is complete.',
  },
  cancelled: {
    buyer: 'This order has been cancelled. No further action possible.',
    seller: 'The buyer cancelled this order. No further action needed.',
  },
};

function Timeline({ po }: { po: PurchaseOrder }) {
  const entries: { label: string; date: string | null; done: boolean }[] = [
    { label: 'Created', date: po.created_at, done: true },
    { label: 'Submitted', date: po.submitted_at, done: po.status !== 'draft' },
    { label: 'Accepted', date: po.accepted_at, done: po.status === 'accepted' || po.status === 'fulfilled' || po.status === 'received' },
    { label: 'Fulfilled', date: po.fulfilled_at, done: po.status === 'fulfilled' || po.status === 'received' },
    { label: 'Received', date: po.received_at, done: po.status === 'received' },
  ];

  if (po.status === 'rejected') {
    entries.push({ label: 'Rejected', date: po.rejected_at, done: true });
  }
  if (po.status === 'cancelled') {
    entries.push({ label: 'Cancelled', date: po.cancelled_at, done: true });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map((e) => (
          <div key={e.label} className="flex items-center gap-1.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${e.done ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <span className={e.done ? 'text-gray-700 font-medium' : 'text-gray-400'}>{e.label}</span>
            {e.date && <span className="text-gray-400">{new Date(e.date).toLocaleDateString()}</span>}
          </div>
        ))}
      </div>
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

export default function ViewPurchaseOrderModal({ purchaseOrder: po, isOpen, onClose }: ViewPurchaseOrderModalProps) {
  const explanation = STATUS_EXPLANATION[po.status] ?? { buyer: '', seller: '' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{po.po_number}</h2>
              {purchaseOrderStatusBadge(po.status)}
            </div>
            <p className="text-sm text-gray-500">
              Seller: <span className="font-medium text-gray-700">{po.seller_business?.name ?? `Business #${po.seller_business_id}`}</span>
              {po.seller_business?.city ? ` · ${po.seller_business.city}` : ''}
            </p>
          </div>
        </div>

        <Timeline po={po} />

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

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-2">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">What this status means</h3>
          <div className="text-sm space-y-1.5">
            <p><span className="font-medium text-gray-700">Buyer (you):</span> {explanation.buyer}</p>
            <p><span className="font-medium text-gray-700">Seller:</span> {explanation.seller}</p>
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

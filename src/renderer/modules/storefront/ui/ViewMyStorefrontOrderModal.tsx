import { Modal } from '../../../shared/components/modals/Modal';
import { Badge } from '../../../shared/components/badges/Badge';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import type { MyStorefrontOrder } from '../api/storefrontTypes';

interface ViewMyStorefrontOrderModalProps {
  order: MyStorefrontOrder;
  isOpen: boolean;
  onClose: () => void;
}

function statusLabel(status: string): { label: string; variant: 'warning' | 'success' | 'primary' | 'danger' | 'neutral' } {
  switch (status) {
    case 'open':
      return { label: 'Open', variant: 'warning' };
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'invoiced':
      return { label: 'Invoiced', variant: 'primary' };
    case 'cancelled':
      return { label: 'Cancelled', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

/** Buyer-facing order detail — same item list pattern as PO / Incoming Orders Eye view. */
export function ViewMyStorefrontOrderModal({
  order,
  isOpen,
  onClose,
}: ViewMyStorefrontOrderModalProps) {
  const badge = statusLabel(order.status);
  const currency = order.currency || 'UGX';
  const items = order.items ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="space-y-5 p-5">
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <h2 className="font-mono text-lg font-bold text-gray-900">{order.order_number}</h2>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm font-medium text-gray-900">{order.shop_name ?? 'Shop'}</p>
          {order.created_at ? (
            <p className="text-xs text-gray-500">
              {new Date(order.created_at).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            {order.status === 'open'
              ? 'Waiting for the shop to fulfill this order. You can still review what you requested below.'
              : order.status === 'cancelled'
                ? 'This order was cancelled. Line items below show what was requested.'
                : 'These are the items you ordered from this shop.'}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Items</h3>
          {items.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
              Item details are not available for this order.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.product_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-gray-900">
                      {item.quantity} × {formatCurrency(Number(item.unit_price), currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Number(item.subtotal), currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <p className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(Number(order.total_amount), currency)}
            </p>
          </div>
        </div>

        {order.notes ? (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</h3>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{order.notes}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

import { Ban, Eye, FileText, Receipt, Trash2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { MyStorefrontOrder } from '../api/storefrontTypes';

interface MyOrderDocActionsProps {
  order: MyStorefrontOrder;
  busy: boolean;
  onView: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onOpenReceipt: () => void;
  onOpenInvoice: () => void;
}

const iconBtn =
  'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-50';

/** B2C My Orders actions — sparse icon controls (Sales History / completed Orders style). */
export function MyOrderDocActions({
  order,
  busy,
  onView,
  onCancel,
  onDelete,
  onOpenReceipt,
  onOpenInvoice,
}: MyOrderDocActionsProps) {
  const hasSale = Boolean(order.sale_id);
  const hasInvoice = Boolean(order.invoice_id);
  const canCancel = order.status === 'open' && Boolean(onCancel);
  const canDelete = order.status === 'cancelled' && Boolean(onDelete);

  return (
    <div className="flex flex-wrap items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={onView}
        disabled={busy}
        className={cn(iconBtn, 'hover:bg-blue-50 hover:text-blue-600')}
        title="View order items"
        aria-label="View order items"
      >
        <Eye className="h-4 w-4" />
      </button>

      {canCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={cn(iconBtn, 'hover:bg-red-50 hover:text-red-600')}
          title="Cancel this open order"
          aria-label="Cancel order"
        >
          <Ban className="h-4 w-4" />
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={cn(iconBtn, 'hover:bg-red-50 hover:text-red-600')}
          title="Remove this cancelled order from your list"
          aria-label="Delete order"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}

      {hasSale ? (
        <button
          type="button"
          onClick={onOpenReceipt}
          disabled={busy}
          className={cn(iconBtn, 'hover:bg-emerald-50 hover:text-emerald-700')}
          title={order.receipt_number ? `Receipt ${order.receipt_number}` : 'View sale receipt'}
          aria-label="View receipt"
        >
          <Receipt className="h-4 w-4" />
        </button>
      ) : null}

      {hasInvoice ? (
        <button
          type="button"
          onClick={onOpenInvoice}
          disabled={busy}
          className={cn(iconBtn, 'hover:bg-indigo-50 hover:text-indigo-600')}
          title={order.invoice_number ? `Invoice ${order.invoice_number}` : 'View invoice'}
          aria-label="View invoice"
        >
          <FileText className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

import { Ban, Eye, FileText, Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import type { MyStorefrontOrder } from '../api/storefrontTypes';

interface MyOrderDocActionsProps {
  order: MyStorefrontOrder;
  busy: boolean;
  onView: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onOpenReceipt: () => void;
  onOpenInvoice: () => void;
  onOpenInvoiceReceipts: () => void;
}

/** B2C My Orders actions — Eye, cancel open, delete cancelled, receipts/invoices. */
export function MyOrderDocActions({
  order,
  busy,
  onView,
  onCancel,
  onDelete,
  onOpenReceipt,
  onOpenInvoice,
  onOpenInvoiceReceipts,
}: MyOrderDocActionsProps) {
  const hasSale = Boolean(order.sale_id);
  const hasInvoice = Boolean(order.invoice_id);
  const canCancel = order.status === 'open' && Boolean(onCancel);
  const canDelete = order.status === 'cancelled' && Boolean(onDelete);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <button
        type="button"
        onClick={onView}
        disabled={busy}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
        title="View order items"
      >
        <Eye className="h-4 w-4" />
      </button>

      {canCancel ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
          title="Cancel this open order"
          className="gap-1"
        >
          <Ban className="h-3.5 w-3.5" />
          Cancel
        </Button>
      ) : null}

      {canDelete ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onDelete}
          title="Remove this cancelled order from your list"
          className="gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      ) : null}

      {hasSale ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onOpenReceipt}
          title={order.receipt_number ? `Receipt ${order.receipt_number}` : 'View sale receipt'}
          className="gap-1"
        >
          <Receipt className="h-3.5 w-3.5" />
          Receipt
        </Button>
      ) : null}
      {hasInvoice ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={onOpenInvoice}
            title={order.invoice_number ? `Invoice ${order.invoice_number}` : 'View invoice'}
            className="gap-1"
          >
            <FileText className="h-3.5 w-3.5" />
            Invoice
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={onOpenInvoiceReceipts}
            title="Payment receipts on this invoice"
            className="gap-1"
          >
            <Receipt className="h-3.5 w-3.5" />
            Payments
          </Button>
        </>
      ) : null}
    </div>
  );
}

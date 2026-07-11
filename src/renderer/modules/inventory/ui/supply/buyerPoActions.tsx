import { Ban, Eye, FileText, PackageCheck, Pencil, Receipt, Send, Trash2 } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

export interface BuyerPoActionHandlers {
  po: PurchaseOrder;
  isOffline: boolean;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onReceive: () => void;
  onOpenInvoice: () => void;
  onOpenReceipts: () => void;
}

/** Status-aware actions for the buyer (Purchase orders) list. */
export function buyerPoActions({
  po,
  isOffline,
  busy,
  onView,
  onEdit,
  onSubmit,
  onCancel,
  onDelete,
  onReceive,
  onOpenInvoice,
  onOpenReceipts,
}: BuyerPoActionHandlers) {
  const hasInvoice = Boolean(po.invoice_id ?? po.invoice?.id);
  const paymentCount = po.invoice?.payments_count ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={onView}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
        title="View order details"
      >
        <Eye className="h-4 w-4" />
      </button>

      {po.status === 'draft' ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
            title="Edit this draft order"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Button
            type="button"
            size="sm"
            disabled={isOffline || busy}
            onClick={onSubmit}
            title="Submit this order to the seller"
            className="inline-flex items-center gap-1"
          >
            <Send className="h-3.5 w-3.5" /> Submit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isOffline || busy}
            onClick={onDelete}
            title="Delete this draft"
            className="inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </>
      ) : null}

      {po.status === 'submitted' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isOffline || busy}
          onClick={onCancel}
          title="Cancel this order"
          className="inline-flex items-center gap-1"
        >
          <Ban className="h-3.5 w-3.5" /> Cancel
        </Button>
      ) : null}

      {po.status === 'rejected' || po.status === 'cancelled' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isOffline || busy}
          onClick={onDelete}
          title={po.status === 'cancelled' ? 'Delete this cancelled order' : 'Delete this rejected order'}
          className="inline-flex items-center gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      ) : null}

      {po.status === 'fulfilled' ? (
        <Button
          type="button"
          size="sm"
          disabled={isOffline}
          onClick={onReceive}
          title="Receive these items into your stock"
          className="inline-flex items-center gap-1"
        >
          <PackageCheck className="h-3.5 w-3.5" /> Receive
        </Button>
      ) : null}

      {hasInvoice ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isOffline}
            onClick={onOpenInvoice}
            title="Open the seller invoice for this order"
            className="inline-flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" /> Invoice
          </Button>
          {paymentCount > 0 || po.status === 'accepted' || po.status === 'fulfilled' || po.status === 'received' ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isOffline}
              onClick={onOpenReceipts}
              title={`${paymentCount} payment receipt${paymentCount === 1 ? '' : 's'} for this order`}
              className="inline-flex items-center gap-1"
            >
              <Receipt className="h-3.5 w-3.5" />
              Receipts{paymentCount > 0 ? ` (${paymentCount})` : ''}
            </Button>
          ) : null}
        </>
      ) : null}
    </>
  );
}

import { Ban, CheckCircle2, Eye, FileText, PackageCheck, Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

export interface SellerPoActionHandlers {
  po: PurchaseOrder;
  isOffline: boolean;
  busy: boolean;
  onView: () => void;
  onAccept: () => void;
  onReject: () => void;
  onFulfill: () => void;
  onDelete: () => void;
  onOpenInvoice: () => void;
  onOpenReceipts: () => void;
}

/** Status-aware actions for the seller (Incoming orders) list. */
export function sellerPoActions({
  po,
  isOffline,
  busy,
  onView,
  onAccept,
  onReject,
  onFulfill,
  onDelete,
  onOpenInvoice,
  onOpenReceipts,
}: SellerPoActionHandlers) {
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

      {po.status === 'submitted' ? (
        <>
          <Button
            type="button"
            size="sm"
            disabled={isOffline || busy}
            onClick={onAccept}
            title="Accept this order (creates invoice for the buyer)"
            className="inline-flex items-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isOffline || busy}
            onClick={onReject}
            title="Reject this order"
            className="inline-flex items-center gap-1"
          >
            <Ban className="h-3.5 w-3.5" /> Reject
          </Button>
        </>
      ) : null}

      {po.status === 'accepted' ? (
        <Button
          type="button"
          size="sm"
          disabled={isOffline || busy}
          onClick={onFulfill}
          title="Fulfill this order (deduct stock)"
          className="inline-flex items-center gap-1"
        >
          <PackageCheck className="h-3.5 w-3.5" /> Fulfill
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

      {hasInvoice ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isOffline}
            onClick={onOpenInvoice}
            title="Open invoice linked to this order"
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
              title="View payment receipts"
              className="inline-flex items-center gap-1"
            >
              <Receipt className="h-3.5 w-3.5" /> Receipts
            </Button>
          ) : null}
        </>
      ) : null}
    </>
  );
}

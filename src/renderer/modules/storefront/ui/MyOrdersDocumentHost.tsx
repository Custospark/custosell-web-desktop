import { useState } from 'react';
import { useToast } from '../../../app/contexts/useToast';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import ViewInvoiceModal from '../../invoices/ViewInvoiceModal';
import type { Invoice } from '../../invoices/api/InvoiceTypes';
import ReceiptPreviewModal from '../../sales/ui/history/ReceiptPreviewModal';
import type { Sale } from '../../sales/api/salesTypes';
import {
  fetchMyStorefrontOrderInvoice,
  fetchMyStorefrontOrderSale,
} from '../api/storefrontBuyerDocs';
import {
  useCancelMyStorefrontOrder,
  useDeleteMyStorefrontOrder,
} from '../api/storefrontBuyerOrderMutations';
import type { MyStorefrontOrder } from '../api/storefrontTypes';
import { MyOrderDocActions } from './MyOrderDocActions';
import { ViewMyStorefrontOrderModal } from './ViewMyStorefrontOrderModal';

type DocTarget =
  | { kind: 'receipt'; orderId: number }
  | { kind: 'invoice'; orderId: number; invoiceId: number; focus: 'details' | 'receipts' };

/**
 * B2C My Orders — Eye, cancel/delete, Receipt/Invoice reuse.
 */
export function MyOrdersDocumentHost({
  order,
}: {
  order: MyStorefrontOrder;
}) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const cancelOrder = useCancelMyStorefrontOrder();
  const deleteOrder = useDeleteMyStorefrontOrder();
  const [busy, setBusy] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [invoiceSeed, setInvoiceSeed] = useState<Invoice | null>(null);
  const [invoiceFocus, setInvoiceFocus] = useState<'details' | 'receipts'>('details');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);

  const actionBusy = busy || cancelOrder.isPending || deleteOrder.isPending;

  const openDoc = async (target: DocTarget) => {
    setBusy(true);
    try {
      if (target.kind === 'receipt') {
        const data = await fetchMyStorefrontOrderSale(target.orderId);
        setSale(data as Sale);
        return;
      }
      const data = await fetchMyStorefrontOrderInvoice(target.orderId);
      setInvoiceSeed(data as Invoice);
      setInvoiceId(target.invoiceId);
      setInvoiceOrderId(target.orderId);
      setInvoiceFocus(target.focus);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : null)
        ?? 'Document not available yet';
      showToast('error', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel this order?',
      message: `${order.order_number} will be cancelled. The shop will no longer fulfill it.`,
      confirmText: 'Cancel order',
      cancelText: 'Keep order',
      variant: 'danger',
    });
    if (!ok) return;
    cancelOrder.mutate(order.id, {
      onSuccess: () => showToast('success', 'Order cancelled'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast('error', msg || 'Could not cancel order');
      },
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete cancelled order?',
      message: `Remove ${order.order_number} from your list? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      variant: 'danger',
    });
    if (!ok) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => showToast('success', 'Order removed'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast('error', msg || 'Could not delete order');
      },
    });
  };

  return (
    <>
      <MyOrderDocActions
        order={order}
        busy={actionBusy}
        onView={() => setViewOpen(true)}
        onCancel={order.status === 'open' ? () => void handleCancel() : undefined}
        onDelete={order.status === 'cancelled' ? () => void handleDelete() : undefined}
        onOpenReceipt={() => void openDoc({ kind: 'receipt', orderId: order.id })}
        onOpenInvoice={() => {
          if (!order.invoice_id) return;
          void openDoc({
            kind: 'invoice',
            orderId: order.id,
            invoiceId: order.invoice_id,
            focus: 'details',
          });
        }}
      />

      {viewOpen ? (
        <ViewMyStorefrontOrderModal
          order={order}
          isOpen
          onClose={() => setViewOpen(false)}
        />
      ) : null}

      {sale ? (
        <ReceiptPreviewModal sale={sale} open onClose={() => setSale(null)} />
      ) : null}

      {invoiceId ? (
        <ViewInvoiceModal
          invoiceId={invoiceId}
          isOpen
          onClose={() => {
            setInvoiceId(null);
            setInvoiceOrderId(null);
            setInvoiceSeed(null);
          }}
          role="storefront_buyer"
          focus={invoiceFocus}
          seed={invoiceSeed}
          storefrontOrderId={invoiceOrderId}
        />
      ) : null}
    </>
  );
}

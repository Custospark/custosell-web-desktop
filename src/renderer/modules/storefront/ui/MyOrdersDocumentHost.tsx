import { useState } from 'react';
import { useToast } from '../../../app/contexts/useToast';
import ViewInvoiceModal from '../../invoices/ViewInvoiceModal';
import type { Invoice } from '../../invoices/api/InvoiceTypes';
import ReceiptPreviewModal from '../../sales/ui/history/ReceiptPreviewModal';
import type { Sale } from '../../sales/api/salesTypes';
import {
  fetchMyStorefrontOrderInvoice,
  fetchMyStorefrontOrderSale,
} from '../api/storefrontBuyerDocs';
import type { MyStorefrontOrder } from '../api/storefrontTypes';
import { MyOrderDocActions } from './MyOrderDocActions';
import { ViewMyStorefrontOrderModal } from './ViewMyStorefrontOrderModal';

type DocTarget =
  | { kind: 'receipt'; orderId: number }
  | { kind: 'invoice'; orderId: number; invoiceId: number; focus: 'details' | 'receipts' };

/**
 * B2C My Orders — Eye opens line items; Receipt/Invoice reuse existing modals.
 */
export function MyOrdersDocumentHost({
  order,
}: {
  order: MyStorefrontOrder;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [invoiceSeed, setInvoiceSeed] = useState<Invoice | null>(null);
  const [invoiceFocus, setInvoiceFocus] = useState<'details' | 'receipts'>('details');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

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

  return (
    <>
      <MyOrderDocActions
        order={order}
        busy={busy}
        onView={() => setViewOpen(true)}
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
        onOpenInvoiceReceipts={() => {
          if (!order.invoice_id) return;
          void openDoc({
            kind: 'invoice',
            orderId: order.id,
            invoiceId: order.invoice_id,
            focus: 'receipts',
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
            setInvoiceSeed(null);
          }}
          role="storefront_buyer"
          focus={invoiceFocus}
          seed={invoiceSeed}
        />
      ) : null}
    </>
  );
}

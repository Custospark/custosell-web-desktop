import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useCreateInvoice } from '../../../invoices/api/InvoiceQueries';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface GenerateInvoiceFromPoModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateInvoiceFromPoModal({ purchaseOrder, isOpen, onClose }: GenerateInvoiceFromPoModalProps) {
  const createInvoice = useCreateInvoice();
  const [done, setDone] = useState(false);

  const sellerName = purchaseOrder.seller_business?.name ?? `Supplier #${purchaseOrder.seller_business_id}`;

  async function handleGenerate() {
    const items = (purchaseOrder.items ?? []).map((item) => ({
      product_id: item.product_id,
      description: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    }));

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await createInvoice.mutateAsync({
      issue_date: today,
      due_date: due,
      tax_total: Number(purchaseOrder.tax_total),
      items,
      notes: `Generated from purchase order ${purchaseOrder.po_number} — ${sellerName}`,
    });

    setDone(true);
  }

  function handleClose() {
    setDone(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={done ? 'Invoice created' : 'Generate invoice from PO'} size="md">
      <div className="p-5 space-y-4">
        {done ? (
          <div className="text-center space-y-3 py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-700">
              A draft invoice has been created from <strong>{purchaseOrder.po_number}</strong>.
            </p>
            <p className="text-xs text-gray-500">Go to Invoices to review, send, or edit it.</p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
              <p className="font-medium">{purchaseOrder.po_number} — {sellerName}</p>
              <p className="text-xs text-blue-700/80 mt-1">
                {purchaseOrder.items?.length ?? 0} items · {formatCurrency(Number(purchaseOrder.total_amount))}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Line items</h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {(purchaseOrder.items ?? []).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-gray-900">
                      {item.product_name}
                      {item.product_sku ? ` (${item.product_sku})` : ''}
                    </span>
                    <span className="shrink-0 text-gray-600">
                      {item.quantity} × {formatCurrency(Number(item.unit_price))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-right text-sm font-medium text-gray-900">
                Total {formatCurrency(Number(purchaseOrder.total_amount))}
              </p>
            </div>

            <p className="text-xs text-gray-500">
              A draft invoice with these items will be created. You can review and send it from the Invoices page.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={createInvoice.isPending}>
                Cancel
              </Button>
              <Button onClick={() => void handleGenerate()} loading={createInvoice.isPending} disabled={createInvoice.isPending}>
                {createInvoice.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-1.5" />
                )}
                Generate invoice
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

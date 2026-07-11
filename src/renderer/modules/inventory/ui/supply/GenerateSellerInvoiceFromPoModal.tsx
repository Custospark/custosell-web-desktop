import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, ExternalLink, Mail } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useCreateInvoice } from '../../../invoices/api/InvoiceQueries';
import { useCreateCustomer } from '../../../customers/api/customers/CustomerQueries';
import SendDocumentEmailModal from '../../../../shared/components/email/SendDocumentEmailModal';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface GenerateSellerInvoiceFromPoModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateSellerInvoiceFromPoModal({
  purchaseOrder,
  isOpen,
  onClose,
}: GenerateSellerInvoiceFromPoModalProps) {
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const createCustomer = useCreateCustomer();
  const [phase, setPhase] = useState<'confirm' | 'success' | 'email'>('confirm');
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [createdInvoiceNum, setCreatedInvoiceNum] = useState('');

  const buyerName = purchaseOrder.buyer_business?.name ?? `Business #${purchaseOrder.buyer_business_id}`;
  const isPending = createInvoice.isPending || createCustomer.isPending;

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

    const customer = await createCustomer.mutateAsync({
      name: buyerName,
      email: null,
    });

    const invoice = await createInvoice.mutateAsync({
      customer_id: customer.id,
      issue_date: today,
      due_date: due,
      tax_total: Number(purchaseOrder.tax_total),
      items,
      notes: `Invoice for fulfilled purchase order ${purchaseOrder.po_number}`,
    });

    setCreatedInvoiceId(invoice.id);
    setCreatedInvoiceNum(invoice.invoice_number);
    setPhase('success');
  }

  function handleClose() {
    setPhase('confirm');
    setCreatedInvoiceId(null);
    setCreatedInvoiceNum('');
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen && phase !== 'email'} onClose={handleClose} title={phase === 'success' ? 'Invoice created' : 'Invoice buyer'} size="md">
        <div className="p-5 space-y-4">
          {phase === 'success' ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{createdInvoiceNum}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Invoice sent to <strong>{buyerName}</strong> as a draft.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase('email');
                  }}
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Email invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    navigate(ROUTES.INVOICES);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View in Invoices
                </Button>
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                <p className="font-medium">{purchaseOrder.po_number} — {buyerName}</p>
                <p className="text-xs text-blue-700/80 mt-1">
                  {purchaseOrder.items?.length ?? 0} items · {formatCurrency(Number(purchaseOrder.total_amount))}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Line items to invoice</h3>
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {(purchaseOrder.items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-gray-900">{item.product_name}</span>
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
                A draft invoice will be created for <strong>{buyerName}</strong> with these items.
                You can review, send, and email it from the Invoices page.
              </p>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={() => void handleGenerate()} loading={isPending} disabled={isPending}>
                  {isPending ? (
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

      {phase === 'email' && createdInvoiceId && (
        <SendDocumentEmailModal
          open
          onClose={() => setPhase('success')}
          documentType="invoice"
          documentId={createdInvoiceId}
          documentLabel={createdInvoiceNum}
          customerName={buyerName}
        />
      )}
    </>
  );
}

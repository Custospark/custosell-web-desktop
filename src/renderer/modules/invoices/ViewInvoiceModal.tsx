import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, Receipt } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { useInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import { downloadInvoicePdf, downloadStorefrontBuyerInvoicePdf, viewInvoicePdf, viewStorefrontBuyerInvoicePdf } from './useInvoicePdf';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  balanceDue,
  displayStatus,
  invoicePartyLabel,
  isReceivedInvoice,
} from './invoiceListHelpers';
import PaymentHistoryList from '../payments/PaymentHistoryList';
import RecordPaymentModal from './RecordPaymentModal';
import { useToast } from '../../app/contexts/useToast';
import { cn } from '../../shared/utils/cn';
import { FiscalStatusBadge } from '../../shared/components/badges/FiscalStatusBadge';

export interface ViewInvoiceModalProps {
  invoiceId: number;
  isOpen: boolean;
  onClose: () => void;
  /** buyer = B2B supplier invoice; seller = sales invoice; storefront_buyer = B2C Discover. */
  role: 'buyer' | 'seller' | 'storefront_buyer';
  /** Open receipts section first. */
  focus?: 'details' | 'receipts';
  seed?: Invoice | null;
  /** Required for storefront_buyer PDF (buyer-scoped route uses order id). */
  storefrontOrderId?: number | null;
}

export function ViewInvoiceModal({
  invoiceId,
  isOpen,
  onClose,
  role,
  focus = 'details',
  seed = null,
  storefrontOrderId = null,
}: ViewInvoiceModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isStorefrontBuyer = role === 'storefront_buyer';
  const { data, isLoading, isError, error } = useInvoice(invoiceId, {
    enabled: isOpen && !isStorefrontBuyer,
  });
  const invoice = data ?? seed;
  const [tab, setTab] = useState<'details' | 'receipts'>(focus);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  const received = invoice
    ? isReceivedInvoice(invoice) || role === 'buyer' || isStorefrontBuyer
    : role === 'buyer' || isStorefrontBuyer;
  const due = invoice ? balanceDue(invoice) : 0;
  const status = invoice ? displayStatus(invoice) : 'sent';
  const canRecord = role === 'seller' && !received && due > 0.009;
  const canPdf = !isStorefrontBuyer || Boolean(storefrontOrderId);

  const lines = useMemo(() => invoice?.items ?? [], [invoice]);

  async function handlePdf(type: 'view' | 'download') {
    if (!invoice) return;
    setPdfBusy(true);
    try {
      if (isStorefrontBuyer) {
        if (!storefrontOrderId) throw new Error('Invoice PDF is not available for this order');
        if (type === 'view') await viewStorefrontBuyerInvoicePdf(storefrontOrderId);
        else await downloadStorefrontBuyerInvoicePdf(storefrontOrderId);
      } else if (type === 'view') {
        await viewInvoicePdf(invoice.id);
      } else {
        await downloadInvoicePdf(invoice.id);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to open PDF');
    } finally {
      setPdfBusy(false);
    }
  }

  function openInList() {
    onClose();
    if (role === 'buyer') {
      navigate(`${ROUTES.INVOICES.SUPPLIER}?invoice=${invoiceId}`);
    } else {
      navigate(`${ROUTES.INVOICES.INDEX}?invoice=${invoiceId}`);
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={invoice?.invoice_number ?? 'Invoice'}
        subtitle={
          isStorefrontBuyer
            ? `Your purchase from ${invoice?.seller_business?.name ?? 'this shop'} — view only.`
            : received
              ? 'Supplier invoice — view only. The seller records payments.'
              : 'Sales invoice — you can record payments when balance remains.'
        }
        size="xl"
        panelClassName="h-[min(92vh,880px)]"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-3"
      >
        {isLoading && !invoice ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-600">Loading invoice…</div>
        ) : isError && !invoice ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-slate-900">Could not load invoice</p>
            <p className="text-sm text-slate-600">
              {error instanceof Error ? error.message : 'Try again or open from the invoices list.'}
            </p>
          </div>
        ) : invoice ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', INVOICE_STATUS_STYLES[status] ?? INVOICE_STATUS_STYLES.sent)}>
                {INVOICE_STATUS_LABELS[status] ?? status}
              </span>
              <FiscalStatusBadge status={invoice.fiscal_status} />
              {invoice.fiscal_status === 'failed' && invoice.fiscal_last_error ? (
                <span className="text-xs text-red-600 max-w-xs truncate" title={invoice.fiscal_last_error}>
                  {invoice.fiscal_last_error}
                </span>
              ) : null}
              <span className="text-sm text-slate-600">
                {received ? 'From' : 'To'}:{' '}
                <span className="font-medium text-slate-900">
                  {invoicePartyLabel(invoice, { asBuyer: received })}
                </span>
              </span>
              {invoice.purchase_order?.po_number ? (
                <span className="text-sm text-slate-600">
                  PO <span className="font-medium text-slate-900">{invoice.purchase_order.po_number}</span>
                </span>
              ) : null}
              {invoice.location?.name ? (
                <span className="text-sm text-slate-600">
                  Branch <span className="font-medium text-slate-900">{invoice.location.name}</span>
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Paid</p>
                <p className="text-sm font-semibold tabular-nums text-emerald-900">{formatCurrency(invoice.amount_paid || 0)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Balance</p>
                <p className="text-sm font-semibold tabular-nums text-amber-900">{formatCurrency(due)}</p>
              </div>
            </div>

            <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setTab('details')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                  tab === 'details' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                <FileText className="h-4 w-4" /> Details
              </button>
              <button
                type="button"
                onClick={() => setTab('receipts')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                  tab === 'receipts' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                <Receipt className="h-4 w-4" /> Receipts
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {tab === 'details' ? (
                <div className="space-y-3">
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {lines.map((line, idx) => (
                      <li key={line.id ?? idx} className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{line.description}</p>
                          <p className="text-xs text-slate-600">
                            {line.quantity} × {formatCurrency(line.unit_price)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                          {formatCurrency(line.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {invoice.notes ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {invoice.notes}
                    </p>
                  ) : null}
                </div>
              ) : (
                <PaymentHistoryList
                  payments={invoice.payments ?? []}
                  totalBill={invoice.total_amount}
                  referenceLabel={invoice.invoice_number}
                  referenceType="Invoice"
                  invoice={invoice}
                  allowRemotePdf={!isStorefrontBuyer}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 shrink-0">
              <div className="flex flex-wrap gap-2">
                {canPdf ? (
                  <>
                    <Button type="button" variant="secondary" size="sm" disabled={pdfBusy} onClick={() => void handlePdf('view')}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View PDF
                    </Button>
                    <Button type="button" variant="secondary" size="sm" disabled={pdfBusy} onClick={() => void handlePdf('download')}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!isStorefrontBuyer ? (
                  <Button type="button" variant="secondary" size="sm" onClick={openInList}>
                    {role === 'buyer' ? 'Open in Supplier invoices' : 'Open in Sales invoices'}
                  </Button>
                ) : null}
                {canRecord ? (
                  <Button type="button" size="sm" onClick={() => setRecordOpen(true)}>
                    Record payment
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {recordOpen && invoice ? (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setRecordOpen(false)}
          onPaymentRecorded={() => setRecordOpen(false)}
        />
      ) : null}
    </>
  );
}

export default ViewInvoiceModal;

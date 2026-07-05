import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import InvoiceBuilderForm from '../../invoices/InvoiceBuilderForm';
import { useSendInvoice } from '../../invoices/api/InvoiceQueries';
import { cartItemsToLineItems } from '../../invoices/invoiceLineItems';
import type { Invoice } from '../../invoices/api/InvoiceTypes';
import { viewInvoicePdf } from '../../invoices/useInvoicePdf';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  FileText, CheckCircle2, Eye, ArrowRight, ShoppingCart, AlertTriangle, Send,
  BookOpen, User, Calendar, Sparkles,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface InvoiceFromSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type BuilderStep = 'build' | 'success';
type SuccessPhase = 'draft' | 'sent';

function balanceDue(inv: Invoice): number {
  return Math.max(0, inv.total_amount - (inv.amount_paid || 0));
}

interface InvoiceSuccessPanelProps {
  invoice: Invoice;
  phase: SuccessPhase;
  pdfLoading: boolean;
  sendLoading: boolean;
  onSend: () => void;
  onPreviewPdf: () => void;
  onOpenInvoices: () => void;
  onDone: () => void;
}

function InvoiceSuccessPanel({
  invoice,
  phase,
  pdfLoading,
  sendLoading,
  onSend,
  onPreviewPdf,
  onOpenInvoices,
  onDone,
}: InvoiceSuccessPanelProps) {
  const isSent = phase === 'sent';
  const customerLabel = invoice.customer?.name ?? 'Walk-in customer';
  const due = balanceDue(invoice);

  return (
    <div className="space-y-4 sm:space-y-5 py-1">
      {/* Hero summary card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border shadow-sm',
          isSent
            ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40'
            : 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/50',
        )}
      >
        <div
          className={cn(
            'absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl opacity-40 pointer-events-none',
            isSent ? 'bg-emerald-300' : 'bg-blue-300',
          )}
        />

        <div className="relative px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={cn(
                'flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ring-1 shadow-sm',
                isSent
                  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200/80'
                  : 'bg-white text-blue-700 ring-slate-200',
              )}
            >
              {isSent ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
                  isSent
                    ? 'bg-emerald-100/90 text-emerald-800 ring-emerald-200'
                    : 'bg-slate-100 text-slate-700 ring-slate-200',
                )}
              >
                {isSent ? (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Sent
                  </>
                ) : (
                  'Draft'
                )}
              </span>

              <h3 className="mt-2 text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                {isSent ? 'Invoice posted to accounting' : 'Draft invoice ready'}
              </h3>

              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {isSent ? (
                  <>
                    <span className="font-mono font-semibold text-gray-900">{invoice.invoice_number}</span>
                    {' '}is live — revenue and receivables are on the books.
                    {due > 0 && (
                      <span className="block mt-1 text-gray-500">
                        {formatCurrency(due)} outstanding until payment is recorded.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-mono font-semibold text-gray-900">{invoice.invoice_number}</span>
                    {' '}saved for <span className="font-medium text-gray-800">{customerLabel}</span>.
                    {' '}Send when ready to post to accounting.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Detail tiles */}
          <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Customer
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 truncate" title={customerLabel}>
                {customerLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 tabular-nums">
                {formatShiftDate(invoice.due_date)}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 py-2.5 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {isSent ? 'Balance' : 'Lines'}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-800">
                {isSent ? (
                  <span className={due > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    {formatCurrency(due)}
                  </span>
                ) : (
                  <>{invoice.items?.length ?? '—'} item{(invoice.items?.length ?? 0) !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Context callout */}
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
          isSent
            ? 'border-emerald-100 bg-emerald-50/70 text-emerald-900'
            : 'border-blue-100 bg-blue-50/60 text-blue-900',
        )}
      >
        {isSent ? (
          <>
            <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Accounts receivable and revenue are recorded. Record payment on the Invoices page when the customer pays.
            </span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              Drafts are editable from Invoices. <strong className="font-semibold">Send &amp; post</strong> posts revenue and receivables to accounting — same as the Send action on the Invoices page.
            </span>
          </>
        )}
      </div>

      {/* Compact action buttons — fit content, wrap on mobile */}
      <div className="flex flex-col items-stretch sm:items-center gap-3 pt-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!isSent && (
            <Button
              size="sm"
              onClick={onSend}
              loading={sendLoading}
              disabled={pdfLoading}
              className="shrink-0"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send &amp; post
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewPdf}
            loading={pdfLoading}
            disabled={sendLoading}
            className="shrink-0"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Preview PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenInvoices}
            disabled={sendLoading || pdfLoading}
            className="shrink-0"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Invoices
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <button
          type="button"
          onClick={onDone}
          disabled={sendLoading}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 self-center',
            'text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Back to Sales
        </button>
      </div>
    </div>
  );
}

export default function InvoiceFromSaleModal({ open, onClose, onSuccess }: InvoiceFromSaleModalProps) {
  const navigate = useNavigate();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const saleNotes = useAppSelector((s) => s.sales.notes);

  const sendInvoice = useSendInvoice();

  const [step, setStep] = useState<BuilderStep>('build');
  const [successPhase, setSuccessPhase] = useState<SuccessPhase>('draft');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const seed = useMemo(() => {
    if (!open || cartItems.length === 0) return undefined;
    return {
      lineItems: cartItemsToLineItems(cartItems),
      customerId,
      notes: saleNotes || undefined,
    };
  }, [open, cartItems, customerId, saleNotes]);

  const hasSaleDiscount = useMemo(() => {
    if (discountAmount <= 0) return false;
    const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
    if (subtotal <= 0) return false;
    const discountValue = discountType === 'percentage'
      ? Math.min(subtotal * (discountAmount / 100), subtotal)
      : Math.min(discountAmount, subtotal);
    return discountValue > 0;
  }, [cartItems, discountAmount, discountType]);

  const modalTitle = useMemo(() => {
    if (step !== 'success') return 'Generate invoice from cart';
    return successPhase === 'sent' ? 'Invoice sent' : 'Draft saved';
  }, [step, successPhase]);

  function handleClose() {
    if (step === 'success') onSuccess();
    onClose();
  }

  function handleCreated(invoice?: Invoice) {
    if (!invoice) return;
    setCreatedInvoice(invoice);
    setSuccessPhase('draft');
    setStep('success');
  }

  function handleSend() {
    if (!createdInvoice) return;
    sendInvoice.mutate(createdInvoice.id, {
      onSuccess: (updated) => {
        setCreatedInvoice(updated);
        setSuccessPhase('sent');
      },
    });
  }

  async function handleViewPdf() {
    if (!createdInvoice) return;
    setPdfLoading(true);
    try {
      await viewInvoicePdf(createdInvoice.id);
    } finally {
      setPdfLoading(false);
    }
  }

  function finishAndGoToInvoices() {
    onSuccess();
    onClose();
    navigate(ROUTES.INVOICES.INDEX);
  }

  function finishAndStayOnSales() {
    onSuccess();
    onClose();
  }

  const builderKey = open ? `sale-invoice-${cartItems.map((c) => `${c.product_id}:${c.quantity}`).join('|')}` : 'closed';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={modalTitle}
      size={step === 'success' ? 'lg' : '2xl'}
      bodyClassName="px-4 py-4 sm:px-6"
      panelClassName="max-h-[95vh]"
    >
      {step === 'success' && createdInvoice ? (
        <InvoiceSuccessPanel
          invoice={createdInvoice}
          phase={successPhase}
          pdfLoading={pdfLoading}
          sendLoading={sendInvoice.isPending}
          onSend={handleSend}
          onPreviewPdf={() => void handleViewPdf()}
          onOpenInvoices={finishAndGoToInvoices}
          onDone={finishAndStayOnSales}
        />
      ) : cartItems.length === 0 ? (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Your cart is empty</p>
            <p className="text-sm text-gray-500 mt-1">Add products to the cart before generating an invoice.</p>
          </div>
          <Button variant="outline" size="sm" className="mx-auto" onClick={onClose}>
            Back to Sales
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {hasSaleDiscount && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                The sale checkout discount is not applied to invoices automatically.
                Adjust line prices below if you need the invoice total to reflect a discount.
              </span>
            </div>
          )}

          <div className={cn(
            'rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1',
          )}>
            <span><strong className="text-gray-800">{cartItems.length}</strong> line{cartItems.length !== 1 ? 's' : ''} from cart</span>
            <span>
              <strong className="text-gray-800">{cartItems.reduce((s, c) => s + c.quantity, 0)}</strong> items total
            </span>
            <span className="text-gray-400 hidden sm:inline">·</span>
            <span className="w-full sm:w-auto">No payment recorded — customer pays when invoice is settled</span>
          </div>

          <InvoiceBuilderForm
            key={builderKey}
            mode="create"
            seed={seed}
            layout="modal"
            onComplete={handleCreated}
            onCancel={onClose}
          />
        </div>
      )}
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import InvoiceBuilderForm from '../../invoices/InvoiceBuilderForm';
import RecordPaymentModal from '../../invoices/RecordPaymentModal';
import { useSendInvoice } from '../../invoices/api/InvoiceQueries';
import { cartItemsToLineItems, saleItemsToLineItems } from '../../invoices/invoiceLineItems';
import type { Invoice } from '../../invoices/api/InvoiceTypes';
import type { Sale } from '../api/salesTypes';
import { viewInvoicePdf } from '../../invoices/useInvoicePdf';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import SendDocumentEmailModal from '../../../shared/components/email/SendDocumentEmailModal';
import type { SendDocumentEmailResult } from '../../../shared/hooks/useDocumentEmail';
import { FileText, ShoppingCart, AlertTriangle } from 'lucide-react';
import { netSaleAmount, toAmount } from '../utils/saleAmounts';
import { cn } from '../../../shared/utils/cn';
import InvoiceSuccessPanel from './InvoiceSuccessPanel';
import type { SuccessPhase } from './invoiceHelpers';
import { balanceDue, parsePaidAmount } from './invoiceHelpers';

interface InvoiceFromSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Completed sale to bill — combines invoice via sale_id so send won't double-post revenue. */
  linkedSale?: Sale | null;
  /** When set, opens the existing linked invoice instead of the create-draft flow. */
  existingInvoice?: Invoice | null;
}

type BuilderStep = 'build' | 'success';

export default function InvoiceFromSaleModal({
  open,
  onClose,
  onSuccess,
  linkedSale,
  existingInvoice,
}: InvoiceFromSaleModalProps) {
  const navigate = useNavigate();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const saleNotes = useAppSelector((s) => s.sales.notes);

  const isLinkedSale = linkedSale != null;
  const linkedReceipt = linkedSale?.receipt_number;

  const sendInvoice = useSendInvoice();

  const [step, setStep] = useState<BuilderStep>('build');
  const [successPhase, setSuccessPhase] = useState<SuccessPhase>('draft');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [invoiceOverride, setInvoiceOverride] = useState<Invoice | null>(null);

  const isViewingExisting = open && existingInvoice != null;
  const resolvedExisting = invoiceOverride ?? existingInvoice;
  const displayInvoice = isViewingExisting ? resolvedExisting : createdInvoice;
  const displayStep: BuilderStep = isViewingExisting ? 'success' : step;
  const displayPhase: SuccessPhase = (() => {
    const inv = displayInvoice;
    if (!inv) return successPhase;
    if (isViewingExisting || invoiceOverride) {
      return inv.status === 'draft' ? 'draft' : 'sent';
    }
    return successPhase;
  })();

  function patchInvoiceEmailCount(result: SendDocumentEmailResult) {
    const patch = {
      email_sent_count: result.email_sent_count,
      last_emailed_at: result.last_emailed_at ?? null,
    };
    if (isViewingExisting) {
      setInvoiceOverride((prev) => {
        const base = prev ?? existingInvoice;
        return base ? { ...base, ...patch } : prev;
      });
    } else {
      setCreatedInvoice((prev) => (prev ? { ...prev, ...patch } : prev));
    }
  }

  const seed = useMemo(() => {
    if (!open || isViewingExisting) return undefined;
    if (isLinkedSale && linkedSale) {
      const lineItems = saleItemsToLineItems(linkedSale.sale_items ?? []);
      if (lineItems.length === 0) return undefined;
      return {
        lineItems,
        customerId: linkedSale.customer_id,
        saleId: linkedSale.id > 0 ? linkedSale.id : null,
        locationId: linkedSale.location_id ?? linkedSale.location?.id ?? null,
        saleTaxTotal: parsePaidAmount(linkedSale.tax_total),
        saleDiscountAmount: parsePaidAmount(linkedSale.discount_amount),
        saleAmountPaid: toAmount(linkedSale.amount_paid),
        saleNetTotal: netSaleAmount(linkedSale),
        notes: linkedSale.notes ?? undefined,
      };
    }
    if (cartItems.length === 0) return undefined;
    const cartSubtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity - (c.discount_amount ?? 0), 0);
    const cartDiscountValue = discountType === 'percentage'
      ? Math.min(cartSubtotal * (discountAmount / 100), cartSubtotal)
      : Math.min(discountAmount, cartSubtotal);
    return {
      lineItems: cartItemsToLineItems(cartItems),
      customerId,
      saleDiscountAmount: Math.max(0, cartDiscountValue),
      notes: saleNotes || undefined,
    };
  }, [open, isViewingExisting, isLinkedSale, linkedSale, cartItems, customerId, saleNotes, discountAmount, discountType]);

  const lineCount = seed?.lineItems.length ?? 0;
  const linkedSalePaid = linkedSale ? toAmount(linkedSale.amount_paid) : 0;
  const linkedSaleTotal = linkedSale ? netSaleAmount(linkedSale) : 0;
  const linkedSaleBalance = Math.max(0, linkedSaleTotal - linkedSalePaid);

  const modalTitle = useMemo(() => {
    if (displayStep === 'success') {
      if (isViewingExisting) {
        return displayInvoice?.status === 'draft' ? 'Linked draft invoice' : 'Linked invoice';
      }
      return displayPhase === 'sent' ? 'Invoice sent' : 'Draft saved';
    }
    return isLinkedSale ? 'Invoice from completed sale' : 'Generate invoice from cart';
  }, [displayStep, displayPhase, isLinkedSale, isViewingExisting, displayInvoice?.status]);

  const hasSaleDiscount = useMemo(() => {
    if (isViewingExisting) return false;
    if (isLinkedSale) return false;
    const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
    if (subtotal <= 0) return false;
    if (discountAmount <= 0) return false;
    const discountValue = discountType === 'percentage'
      ? Math.min(subtotal * (discountAmount / 100), subtotal)
      : Math.min(discountAmount, subtotal);
    return discountValue > 0;
  }, [cartItems, discountAmount, discountType, isLinkedSale, isViewingExisting]);

  function handleClose() {
    if (displayStep === 'success' && !isViewingExisting) onSuccess();
    setStep('build');
    setSuccessPhase('draft');
    setCreatedInvoice(null);
    setInvoiceOverride(null);
    setPaymentModalOpen(false);
    onClose();
  }

  function handleCreated(invoice?: Invoice) {
    if (!invoice) return;
    setCreatedInvoice(invoice);
    setSuccessPhase('draft');
    setStep('success');
  }

  function handleSend() {
    if (!displayInvoice) return;
    sendInvoice.mutate(displayInvoice.id, {
      onSuccess: (updated) => {
        if (isViewingExisting) {
          setInvoiceOverride(updated);
        } else {
          setCreatedInvoice(updated);
          setSuccessPhase('sent');
        }
      },
    });
  }

  async function handleViewPdf() {
    if (!displayInvoice) return;
    setPdfLoading(true);
    try {
      await viewInvoicePdf(displayInvoice.id);
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

  const builderKey = open
    ? isLinkedSale && linkedSale
      ? `linked-sale-${linkedSale.id}`
      : `sale-invoice-${cartItems.map((c) => `${c.product_id}:${c.quantity}`).join('|')}`
    : 'closed';

  return (
    <>
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={modalTitle}
      size={displayStep === 'success' ? 'xl' : '2xl'}
      bodyClassName={cn(
        'px-4 py-4 sm:px-6',
        displayStep === 'success' && 'lg:px-8 lg:py-6',
      )}
      panelClassName={cn(
        'max-h-[95vh]',
        displayStep === 'success' && 'lg:max-w-3xl xl:max-w-4xl lg:min-h-[28rem]',
      )}
    >
      {displayStep === 'success' && displayInvoice ? (
        <InvoiceSuccessPanel
          invoice={displayInvoice}
          phase={displayPhase}
          pdfLoading={pdfLoading}
          sendLoading={sendInvoice.isPending}
          onSend={handleSend}
          onPreviewPdf={() => void handleViewPdf()}
          onOpenInvoices={finishAndGoToInvoices}
          onDone={finishAndStayOnSales}
          onRecordPayment={
            displayPhase === 'sent' && balanceDue(displayInvoice) > 0
              ? () => setPaymentModalOpen(true)
              : undefined
          }
          onEmail={displayInvoice.id > 0 ? () => setEmailModalOpen(true) : undefined}
          emailSentCount={displayInvoice.email_sent_count ?? 0}
          linkedToSale={isLinkedSale}
          linkedReceipt={linkedReceipt}
        />
      ) : lineCount === 0 ? (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {isLinkedSale ? 'No billable items on this sale' : 'Your cart is empty'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isLinkedSale
                ? 'Fully refunded sales cannot be invoiced.'
                : 'Add products to the cart before generating an invoice.'}
            </p>
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
                The sale checkout discount is carried to this invoice automatically and stays editable below.
              </span>
            </div>
          )}

          {isLinkedSale && linkedSale && linkedSale.id <= 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This sale is not synced yet. The invoice will be created without a sale link until the sale syncs.
              </span>
            </div>
          )}

          {isLinkedSale && linkedSale && linkedSale.id > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Billing document for sale <span className="font-mono font-semibold">{linkedSale.receipt_number}</span>.
                Sending will not duplicate revenue already posted on the sale.
              </span>
            </div>
          )}

          <div className={cn(
            'rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1',
          )}>
            <span><strong className="text-gray-800">{lineCount}</strong> line{lineCount !== 1 ? 's' : ''}{isLinkedSale ? ' from sale' : ' from cart'}</span>
            <span>
              <strong className="text-gray-800">{seed?.lineItems.reduce((s, c) => s + c.quantity, 0) ?? 0}</strong> items total
            </span>
            <span className="text-gray-400 hidden sm:inline">·</span>
            <span className="w-full sm:w-auto">
              {isLinkedSale && linkedSalePaid > 0.009 ? (
                <>
                  <strong className="text-gray-800">{formatCurrency(linkedSalePaid)}</strong> already collected on this sale
                  {linkedSaleBalance > 0.009 && (
                    <> · <strong className="text-gray-800">{formatCurrency(linkedSaleBalance)}</strong> balance will carry to the invoice</>
                  )}
                </>
              ) : (
                'No payment recorded — customer pays when invoice is settled'
              )}
            </span>
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
      {paymentModalOpen && displayInvoice && (
        <RecordPaymentModal
          invoice={displayInvoice}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentRecorded={({ invoice }) => {
            if (isViewingExisting) setInvoiceOverride(invoice);
            else setCreatedInvoice(invoice);
            setPaymentModalOpen(false);
          }}
        />
      )}
    </Modal>

    {emailModalOpen && displayInvoice && (
      <SendDocumentEmailModal
        open
        onClose={() => setEmailModalOpen(false)}
        documentType="invoice"
        documentId={displayInvoice.id}
        documentLabel={`Invoice ${displayInvoice.invoice_number}`}
        customerName={displayInvoice.customer?.name}
        defaultEmail={displayInvoice.customer?.email ?? linkedSale?.customer?.email}
        customerId={displayInvoice.customer_id ?? linkedSale?.customer_id}
        saleId={linkedSale?.id}
        emailSentCount={displayInvoice.email_sent_count ?? 0}
        onSent={patchInvoiceEmailCount}
      />
    )}
    </>
  );
}

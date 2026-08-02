import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { EmailSentCountBadge, emailSentLabel } from '../../../shared/components/email/EmailSentCountBadge';
import type { Invoice } from '../../invoices/api/InvoiceTypes';
import {
  FileText, CheckCircle2, Eye, ArrowRight, ShoppingCart, Send,
  BookOpen, User, Calendar, Sparkles, DollarSign, Mail,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { SuccessPhase } from './invoiceHelpers';
import { balanceDue, parsePaidAmount } from './invoiceHelpers';

interface InvoiceSuccessPanelProps {
  invoice: Invoice;
  phase: SuccessPhase;
  pdfLoading: boolean;
  sendLoading: boolean;
  onSend: () => void;
  onPreviewPdf: () => void;
  onOpenInvoices: () => void;
  onDone: () => void;
  onRecordPayment?: () => void;
  onEmail?: () => void;
  emailSentCount?: number;
  linkedToSale?: boolean;
  linkedReceipt?: string;
}

export default function InvoiceSuccessPanel({
  invoice,
  phase,
  pdfLoading,
  sendLoading,
  onSend,
  onPreviewPdf,
  onOpenInvoices,
  onDone,
  onRecordPayment,
  onEmail,
  emailSentCount = 0,
  linkedToSale,
  linkedReceipt,
}: InvoiceSuccessPanelProps) {
  const isSent = phase === 'sent';
  const customerLabel = invoice.customer?.name ?? 'Walk-in customer';
  const paid = parsePaidAmount(invoice.amount_paid);
  const due = balanceDue(invoice);
  const hasPayments = paid > 0.009;

  return (
    <div className="space-y-4 sm:space-y-5 py-1">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border shadow-sm',
          isSent
            ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40'
            : 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/50',
        )}
      >
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
                    {' '}
                    {linkedToSale
                      ? 'is live — billing document posted without duplicating sale revenue.'
                      : 'is live — revenue and receivables are on the books.'}
                    {due > 0.009 && (
                      <span className="block mt-1 text-gray-500">
                        {formatCurrency(due)} outstanding until payment is recorded.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-mono font-semibold text-gray-900">{invoice.invoice_number}</span>
                    {' '}saved for <span className="font-medium text-gray-800">{customerLabel}</span>.
                    {hasPayments ? (
                      <span className="block mt-1 text-gray-500">
                        {formatCurrency(paid)} already collected on the linked sale
                        {due > 0.009 ? ` · ${formatCurrency(due)} balance due` : ' · paid in full'}.
                      </span>
                    ) : (
                      <> Send when ready to post to accounting.</>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className={cn(
            'mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3',
            (hasPayments || isSent) ? 'sm:grid-cols-5' : 'sm:grid-cols-4',
          )}>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums break-words leading-snug">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Customer
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 break-words leading-snug">
                {customerLabel}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 tabular-nums">
                {formatShiftDate(invoice.due_date)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm col-span-2 sm:col-span-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {hasPayments ? 'Paid' : isSent ? 'Balance' : 'Lines'}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-800 break-words leading-snug">
                {hasPayments ? (
                  <span className="text-emerald-700">{formatCurrency(paid)}</span>
                ) : isSent ? (
                  <span className={due > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    {formatCurrency(due)}
                  </span>
                ) : (
                  <>{invoice.items?.length ?? '—'} item{(invoice.items?.length ?? 0) !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>
            {(hasPayments || isSent) && (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm col-span-2 sm:col-span-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Balance</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums break-words leading-snug">
                  <span className={due > 0.009 ? 'text-amber-700' : 'text-emerald-700'}>
                    {formatCurrency(due)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
              {linkedToSale
                ? `Linked to sale ${linkedReceipt} — revenue was already posted on the sale, so accounting was not duplicated.`
                : 'Accounts receivable and revenue are recorded. Record payment on the Invoices page when the customer pays.'}
            </span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              {linkedToSale ? (
                <>
                  Linked to sale <span className="font-mono font-semibold">{linkedReceipt}</span>.{' '}
                  {hasPayments ? (
                    <>Payments on the sale carry over to this invoice. <strong className="font-semibold">Send &amp; post</strong> delivers the billing document without duplicating sale revenue.</>
                  ) : (
                    <><strong className="font-semibold">Send &amp; post</strong> delivers the billing document without duplicating sale revenue.</>
                  )}
                </>
              ) : (
                <>
                  Drafts are editable from Invoices. <strong className="font-semibold">Send &amp; post</strong> posts revenue and receivables to accounting — same as the Send action on the Invoices page.
                </>
              )}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col items-stretch sm:items-center gap-3 pt-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isSent && due > 0 && onRecordPayment && (
            <Button size="sm" onClick={onRecordPayment} className="shrink-0">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              Record payment
            </Button>
          )}
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
          {onEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEmail}
              disabled={sendLoading || pdfLoading}
              className="shrink-0"
              title={emailSentLabel(emailSentCount)}
            >
              <span className="relative inline-flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Email
                <EmailSentCountBadge count={emailSentCount} className="-top-1.5 -right-2.5" />
              </span>
            </Button>
          )}
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
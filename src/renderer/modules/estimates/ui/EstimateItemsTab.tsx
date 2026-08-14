import { Card } from '../../../shared/components/cards/Card';
import EstimateMarginSummary from './EstimateMarginSummary';
import EstimateLineItemEditor, { estimateToEditableItems } from './EstimateLineItemEditor';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Link } from 'react-router-dom';
import type { Estimate } from '../api/estimateTypes';
import { Calendar, FileText, FolderKanban, ReceiptText } from 'lucide-react';

const n = (v: unknown): number => Number(v) || 0;

interface EstimateItemsTabProps {
  estimate: Estimate;
  updatePending: boolean;
  onValidUntilChange: (value: string) => void;
}

function LinkedInvoice({ estimate }: { estimate: Estimate }) {
  if (!estimate.invoice) return null;
  const invoice = estimate.invoice;
  return (
    <Card className="p-4 text-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <FileText className="h-4 w-4 text-blue-600" />
        Linked invoice
      </div>
      <Link
        to={ROUTES.INVOICES.INDEX}
        className="mt-1 inline-flex items-center gap-2 hover:opacity-80"
      >
        <span className="font-mono text-sm font-semibold text-blue-700">{invoice.invoice_number}</span>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
          invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
          invoice.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' :
          invoice.status === 'sent' ? 'bg-blue-50 text-blue-700' :
          'bg-gray-100 text-gray-700',
        )}>
          {invoice.status.replace('_', ' ')}
        </span>
      </Link>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${Math.min(100, (n(invoice.amount_paid) / n(invoice.total_amount)) * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
        <span>{formatCurrency(n(invoice.amount_paid), estimate.currency)} paid</span>
        <span>{formatCurrency(n(invoice.total_amount), estimate.currency)} total</span>
      </div>

      {(invoice.payments ?? []).length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600">Payment receipts</p>
          {(invoice.payments ?? []).map((pmt) => (
            <div key={pmt.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900">{pmt.receipt_number}</p>
                <p className="text-[11px] text-gray-500 capitalize">
                  {pmt.payment_method.replace(/_/g, ' ')} · {formatShiftDate(pmt.paid_at)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-900">
                {formatCurrency(n(pmt.amount), estimate.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LinkedProject({ estimate }: { estimate: Estimate }) {
  if (!estimate.project) return null;
  return (
    <Card className="p-4 text-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <FolderKanban className="h-4 w-4 text-violet-600" />
        Linked project
      </div>
      <Link
        to={ROUTES.ESTIMATES.PROJECT_DETAIL(estimate.project.id)}
        className="mt-1 inline-flex items-center gap-1.5 text-blue-600 hover:underline"
      >
        <span className="font-medium text-sm text-gray-900">{estimate.project.name}</span>
        <span className="font-mono text-xs text-gray-400">{estimate.project.project_number}</span>
      </Link>
      <div className="mt-0.5 text-xs text-gray-500 capitalize">
        Status: {estimate.project.status.replace('_', ' ')}
      </div>
    </Card>
  );
}

export default function EstimateItemsTab({
  estimate,
  updatePending,
  onValidUntilChange,
}: EstimateItemsTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-4 sm:p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ReceiptText className="h-4 w-4 text-blue-600" />
          Line items
        </div>
        <EstimateLineItemEditor
          items={estimateToEditableItems(estimate.line_items)}
          onChange={() => {}}
          currency={estimate.currency}
          readOnly
        />

        {(estimate.notes || estimate.terms) && (
          <div className="mt-6 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            {estimate.notes && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h4>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
            {estimate.terms && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Terms</h4>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{estimate.terms}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <EstimateMarginSummary lineItems={estimate.line_items} currency={estimate.currency} taxRate={estimate.tax_rate} />
        <Card className="space-y-3 p-4 text-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Calendar className="h-4 w-4 text-gray-400" />
            Summary
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(estimate.subtotal, estimate.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax ({estimate.tax_rate}%)</span>
            <span className="font-medium tabular-nums">{formatCurrency(estimate.tax_total, estimate.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-blue-700 tabular-nums">{formatCurrency(n(estimate.total), estimate.currency)}</span>
          </div>
          {estimate.valid_until !== undefined && (
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Valid until</span>
              </label>
              <input
                type="date"
                value={estimate.valid_until?.slice(0, 10) ?? ''}
                onChange={(e) => onValidUntilChange(e.target.value)}
                disabled={updatePending || estimate.status === 'converted'}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
              />
            </div>
          )}
        </Card>

        <LinkedInvoice estimate={estimate} />
        <LinkedProject estimate={estimate} />
      </div>
    </div>
  );
}

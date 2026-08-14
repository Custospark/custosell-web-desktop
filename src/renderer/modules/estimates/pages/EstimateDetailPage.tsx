import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useEstimate,
  useEstimateVersions,
  useSendEstimate,
  useRejectEstimate,
  useEmailEstimate,
  useDuplicateEstimate,
  useUpdateEstimate,
} from '../api/useEstimateQueries';
import EstimateStatusBadge, { displayEstimateStatus } from '../ui/EstimateStatusBadge';
import EstimateMarginSummary from '../ui/EstimateMarginSummary';
import EstimateLineItemEditor, { estimateToEditableItems } from '../ui/EstimateLineItemEditor';
import { PipelineModalHero } from '../ui/estimatesShared';
import ConvertEstimateModal from '../ui/ConvertEstimateModal';
import ApproveEstimateModal from '../ui/ApproveEstimateModal';
import { viewEstimatePdf, downloadEstimatePdf } from '../useEstimatePdf';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
const n = (v: unknown): number => Number(v) || 0;

import {
  ArrowLeft, Send, CheckCircle2, XCircle, Download, Mail, Copy, FileText, FolderKanban,
  History, ReceiptText, TrendingUp, DollarSign, Percent, Target,
  Calendar, Eye,
} from 'lucide-react';

type DetailTab = 'items' | 'history' | 'notes';

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', glow: 'bg-blue-500/10' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', glow: 'bg-green-500/10' },
  purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', glow: 'bg-purple-500/10' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', glow: 'bg-amber-500/10' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', glow: 'bg-indigo-500/10' },
};

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: keyof typeof cardStyles }) {
  const s = cardStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-white p-4 ${s.border}`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-xl ${s.glow}`} />
      <div className="relative flex items-start gap-3">
        <div className={`shrink-0 rounded-lg p-2 ${s.iconBg}`}>
          <Icon className={`h-4 w-4 ${s.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const estimateId = Number(id);
  const navigate = useNavigate();

  const { data: estimate, isLoading } = useEstimate(estimateId);
  const { data: versions } = useEstimateVersions(estimateId);
  const sendEstimate = useSendEstimate();
  const rejectEstimate = useRejectEstimate();
  const emailEstimate = useEmailEstimate();
  const duplicateEstimate = useDuplicateEstimate();
  const updateEstimate = useUpdateEstimate();

  const [activeTab, setActiveTab] = useState<DetailTab>('items');
  const [showApprove, setShowApprove] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<'preview' | 'download' | null>(null);

  if (isLoading || !estimate) {
    return (
      <div className="flex justify-center py-16">
        <CustosellLoader />
      </div>
    );
  }

  const status = displayEstimateStatus(estimate.status, estimate.valid_until);
  const lineItems = estimateToEditableItems(estimate.line_items);
  const canSend = estimate.status === 'draft';
  const canApprove = estimate.status === 'draft' || estimate.status === 'sent';
  const canReject = estimate.status === 'sent';
  const canConvert = (estimate.status === 'approved' || estimate.status === 'converted') && (!estimate.invoice_id || !estimate.project_id);
  const hasBillableItems = estimate.line_items.some((li) => li.is_billable);

  const handleEmail = async () => {
    if (!emailTo.trim()) return;
    await emailEstimate.mutateAsync({
      id: estimate.id,
      payload: { to: emailTo.trim(), customer_id: estimate.customer_id },
    });
    setShowEmail(false);
  };

  const handlePreview = async () => {
    setPdfBusy('preview');
    try {
      await viewEstimatePdf(estimate.id);
    } catch {
      /* toast handled in the pdf utility */
    } finally {
      setPdfBusy(null);
    }
  };

  const handleDownload = async () => {
    setPdfBusy('download');
    try {
      await downloadEstimatePdf(estimate.id);
    } catch {
      /* toast handled in the pdf utility */
    } finally {
      setPdfBusy(null);
    }
  };

  const tabs = [
    { key: 'items' as const, label: 'Line items', icon: ReceiptText },
    { key: 'history' as const, label: 'Version history', icon: History },
    { key: 'notes' as const, label: 'Notes & terms', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ESTIMATES.INDEX)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to estimates
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">{estimate.title}</h2>
              <EstimateStatusBadge status={status} />
              <span className="font-mono text-sm text-gray-500">{estimate.estimate_number} · v{estimate.version}</span>
            </div>
            {estimate.customer && (
              <p className="mt-1 text-sm text-gray-600">
                Customer: <span className="font-medium text-gray-800">{estimate.customer.name}</span>
                {estimate.customer.email && <span className="text-gray-400"> · {estimate.customer.email}</span>}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canSend && (
              <Button
                size="sm"
                onClick={() => sendEstimate.mutate(estimate.id)}
                loading={sendEstimate.isPending}
                title="Mark as sent - no email is sent. Use 'Send by email' to send an actual email."
              >
                <Send className="h-4 w-4" />
                Mark as sent
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  size="sm"
                  onClick={() => setShowApprove(true)}
                  title="Approve the proposal and optionally create invoice or project"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & convert
                </Button>
                {canReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReject(true)}
                    title="Decline the proposal with a reason"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline proposal
                  </Button>
                )}
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEmail(true)}
              title="Send a copy of the estimate by email"
            >
              <Mail className="h-4 w-4" />
              Send by email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreview}
              loading={pdfBusy === 'preview'}
              title="Preview the estimate as a PDF document"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              loading={pdfBusy === 'download'}
              title="Download the estimate as a PDF file"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => duplicateEstimate.mutate(estimate.id)}
              loading={duplicateEstimate.isPending}
              title="Create a copy of this estimate"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {canConvert && (
              <Button
                size="sm"
                onClick={() => setShowConvert(true)}
                title="Convert to an invoice or project"
              >
                <FolderKanban className="h-4 w-4" />
                Convert
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Total"
          value={formatCurrency(n(estimate.total), estimate.currency)}
          icon={DollarSign}
          color="blue"
        />
        <MiniStat
          label="Cost"
          value={formatCurrency(n(estimate.cost_subtotal), estimate.currency)}
          icon={TrendingUp}
          color="amber"
        />
        <MiniStat
          label="Gross profit"
          value={formatCurrency(n(estimate.gross_profit), estimate.currency)}
          icon={Target}
          color="green"
        />
        <MiniStat
          label="Margin"
          value={`${n(estimate.margin_percent).toFixed(1)}%`}
          icon={Percent}
          color="purple"
        />
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'items' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-4 sm:p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <ReceiptText className="h-4 w-4 text-blue-600" />
              Line items
            </div>
            <EstimateLineItemEditor items={lineItems} onChange={() => {}} currency={estimate.currency} readOnly />

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
                    onChange={(e) => {
                      void updateEstimate.mutateAsync({
                        id: estimate.id,
                        payload: {
                          title: estimate.title,
                          line_items: estimate.line_items.map((li) => ({
                            description: li.description,
                            quantity: li.quantity,
                            unit_cost: li.unit_cost,
                            markup_type: li.markup_type,
                            markup_value: li.markup_value,
                            unit_price: li.unit_price,
                            type: li.type,
                            is_billable: li.is_billable,
                          })),
                          valid_until: e.target.value || null,
                        },
                      });
                    }}
                    disabled={updateEstimate.isPending || estimate.status === 'converted'}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
                  />
                </div>
              )}
            </Card>

            {estimate.invoice && (
              <Card className="p-4 text-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Linked invoice
                </div>
                <Link
                  to={ROUTES.INVOICES.INDEX}
                  className="mt-1 inline-flex items-center gap-2 hover:opacity-80"
                >
                  <span className="font-mono text-sm font-semibold text-blue-700">{estimate.invoice.invoice_number}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    estimate.invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    estimate.invoice.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' :
                    estimate.invoice.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-100 text-gray-700',
                  )}>
                    {estimate.invoice.status.replace('_', ' ')}
                  </span>
                </Link>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (n(estimate.invoice.amount_paid) / n(estimate.invoice.total_amount)) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatCurrency(n(estimate.invoice.amount_paid), estimate.currency)} paid</span>
                  <span>{formatCurrency(n(estimate.invoice.total_amount), estimate.currency)} total</span>
                </div>

                {(estimate.invoice.payments ?? []).length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-600">Payment receipts</p>
                    {(estimate.invoice.payments ?? []).map((pmt) => (
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
            )}
            {estimate.project && (
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
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <History className="h-4 w-4 text-blue-600" />
            Version history
          </div>
          {(versions ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <History className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No version history yet.</p>
              <p className="text-xs text-gray-400 mt-1">Versions are created when you send or update an estimate.</p>
            </div>
          ) : (
            <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gray-200">
              {(versions ?? []).map((v, idx) => (
                <div key={v.id} className="relative pb-6 last:pb-0">
                  <div className={cn(
                    'absolute -left-[23px] top-1 h-4 w-4 rounded-full border-2 border-white ring-2',
                    idx === 0 ? 'bg-blue-500 ring-blue-300' : 'bg-gray-300 ring-gray-200',
                  )} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Version {v.version}</p>
                      {v.change_summary && (
                        <p className="text-sm text-gray-500">{v.change_summary}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatShiftDate(v.created_at)}</p>
                  </div>
                  {v.creator && (
                    <p className="mt-0.5 text-xs text-gray-400">by {v.creator.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <FileText className="h-4 w-4 text-blue-600" />
            Notes & terms
          </div>
          {(estimate.notes || estimate.terms) ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {estimate.notes && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer notes</h4>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{estimate.notes}</p>
                </div>
              )}
              {estimate.terms && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Terms & conditions</h4>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{estimate.terms}</p>
                </div>
              )}
              {estimate.internal_notes && (
                <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600">Internal notes</h4>
                  <p className="mt-2 text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{estimate.internal_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No notes or terms added.</p>
            </div>
          )}
        </Card>
      )}

      <ApproveEstimateModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        estimateId={estimate.id}
        estimateTitle={estimate.title}
        hasBillableItems={hasBillableItems}
        hasInvoice={Boolean(estimate.invoice_id)}
        hasProject={Boolean(estimate.project_id)}
      />

      <ConvertEstimateModal
        open={showConvert}
        onClose={() => setShowConvert(false)}
        estimateId={estimate.id}
        estimateTitle={estimate.title}
        hasInvoice={Boolean(estimate.invoice_id)}
        hasProject={Boolean(estimate.project_id)}
      />

      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Decline proposal">
        <div className="space-y-5">
          <PipelineModalHero
            icon={XCircle}
            title="Decline this proposal"
            description="Provide a reason so the customer understands why the proposal was declined."
            tone="red"
          />
          <Input
            label="Reason for declining"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Budget too high, scope changed, etc."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={rejectEstimate.isPending}
              disabled={!rejectReason.trim()}
              onClick={async () => {
                await rejectEstimate.mutateAsync({ id: estimate.id, payload: { rejection_reason: rejectReason.trim() } });
                setShowReject(false);
              }}
            >
              <XCircle className="h-4 w-4" />
              Decline proposal
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEmail} onClose={() => setShowEmail(false)} title="Email estimate">
        <div className="space-y-5">
          <PipelineModalHero
            icon={Mail}
            title="Send by email"
            description="Share this estimate with the customer as a professional email attachment."
            tone="blue"
          />
          <Input
            label="Recipient email"
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder={estimate.customer?.email ?? 'customer@example.com'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEmail(false)}>Cancel</Button>
            <Button loading={emailEstimate.isPending} onClick={handleEmail} className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
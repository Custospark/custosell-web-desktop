import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useEstimate,
  useEstimateVersions,
  useSendEstimate,
  useApproveEstimate,
  useRejectEstimate,
  useEmailEstimate,
  useDuplicateEstimate,
} from '../api/useEstimateQueries';
import EstimateStatusBadge, { displayEstimateStatus } from '../ui/EstimateStatusBadge';
import EstimateMarginSummary from '../ui/EstimateMarginSummary';
import EstimateLineItemEditor, { estimateToEditableItems } from '../ui/EstimateLineItemEditor';
import ConvertEstimateModal from '../ui/ConvertEstimateModal';
import { viewEstimatePdf, downloadEstimatePdf } from '../useEstimatePdf';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Download, Mail, Copy, FileText, FolderKanban, History,
} from 'lucide-react';

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const estimateId = Number(id);
  const navigate = useNavigate();

  const { data: estimate, isLoading } = useEstimate(estimateId);
  const { data: versions } = useEstimateVersions(estimateId);
  const sendEstimate = useSendEstimate();
  const approveEstimate = useApproveEstimate();
  const rejectEstimate = useRejectEstimate();
  const emailEstimate = useEmailEstimate();
  const duplicateEstimate = useDuplicateEstimate();

  const [showConvert, setShowConvert] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  if (isLoading || !estimate) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const status = displayEstimateStatus(estimate.status, estimate.valid_until);
  const lineItems = estimateToEditableItems(estimate.line_items);
  const canSend = estimate.status === 'draft';
  const canApprove = estimate.status === 'sent';
  const canConvert = estimate.status === 'approved' || estimate.status === 'converted';

  const handleEmail = async () => {
    if (!emailTo.trim()) return;
    await emailEstimate.mutateAsync({
      id: estimate.id,
      payload: { to: emailTo.trim(), customer_id: estimate.customer_id },
    });
    setShowEmail(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ESTIMATES.INDEX)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to estimates
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{estimate.title}</h2>
            <EstimateStatusBadge status={status} />
            <span className="font-mono text-sm text-gray-500">{estimate.estimate_number} · v{estimate.version}</span>
          </div>
          {estimate.customer && (
            <p className="mt-1 text-sm text-gray-600">Customer: {estimate.customer.name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button size="sm" onClick={() => sendEstimate.mutate(estimate.id)} loading={sendEstimate.isPending}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          )}
          {canApprove && (
            <>
              <Button size="sm" onClick={() => approveEstimate.mutate({ id: estimate.id })} loading={approveEstimate.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowEmail(true)}>
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => viewEstimatePdf(estimate.id)}>
            <FileText className="h-4 w-4" />
            View PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadEstimatePdf(estimate.id)}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={() => duplicateEstimate.mutate(estimate.id)} loading={duplicateEstimate.isPending}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          {canConvert && (
            <Button size="sm" onClick={() => setShowConvert(true)}>
              <FolderKanban className="h-4 w-4" />
              Convert
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Line items</h3>
          <EstimateLineItemEditor items={lineItems} onChange={() => {}} currency={estimate.currency} readOnly />
        </Card>
        <div className="space-y-4">
          <EstimateMarginSummary lineItems={estimate.line_items} currency={estimate.currency} taxRate={estimate.tax_rate} />
          <Card className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(estimate.subtotal, estimate.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium">{formatCurrency(estimate.tax_total, estimate.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="text-blue-700">{formatCurrency(estimate.total, estimate.currency)}</span>
            </div>
            {estimate.valid_until && (
              <p className="pt-2 text-xs text-gray-500">Valid until {formatShiftDate(estimate.valid_until)}</p>
            )}
          </Card>
          {estimate.invoice_id && (
            <Card className="p-4 text-sm">
              <p className="font-medium text-gray-800">Linked invoice</p>
              <Link to={ROUTES.INVOICES.INDEX} className="text-blue-600 hover:underline">View invoices</Link>
            </Card>
          )}
          {estimate.project_id && (
            <Card className="p-4 text-sm">
              <p className="font-medium text-gray-800">Linked project</p>
              <Link to={ROUTES.ESTIMATES.PROJECT_DETAIL(estimate.project_id)} className="text-blue-600 hover:underline">
                Open project
              </Link>
            </Card>
          )}
        </div>
      </div>

      {(estimate.notes || estimate.terms) && (
        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          {estimate.notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500">Notes</h4>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}
          {estimate.terms && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500">Terms</h4>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{estimate.terms}</p>
            </div>
          )}
        </Card>
      )}

      {(versions ?? []).length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <History className="h-4 w-4" />
            Version history
          </div>
          <ul className="divide-y divide-gray-100">
            {(versions ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                <span>Version {v.version}</span>
                <span className="text-gray-500">{v.change_summary ?? 'Snapshot'}</span>
                <span className="text-xs text-gray-400">{formatShiftDate(v.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConvertEstimateModal
        open={showConvert}
        onClose={() => setShowConvert(false)}
        estimateId={estimate.id}
        estimateTitle={estimate.title}
        hasInvoice={Boolean(estimate.invoice_id)}
        hasProject={Boolean(estimate.project_id)}
      />

      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject estimate">
        <Input
          label="Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Why was this estimate declined?"
        />
        <div className="mt-4 flex justify-end gap-2">
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
            Reject
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showEmail} onClose={() => setShowEmail(false)} title="Email estimate">
        <Input
          label="To"
          type="email"
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
          placeholder={estimate.customer?.email ?? 'customer@example.com'}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowEmail(false)}>Cancel</Button>
          <Button loading={emailEstimate.isPending} onClick={handleEmail}>Send email</Button>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import {
  useEstimate,
  useEstimateVersions,
  useSendEstimate,
  useRejectEstimate,
  useEmailEstimate,
  useDuplicateEstimate,
  useUpdateEstimate,
} from '../api/useEstimateQueries';
import { displayEstimateStatus } from '../ui/EstimateStatusBadge';
import EstimateDetailHeader from '../ui/EstimateDetailHeader';
import EstimateStats from '../ui/EstimateStats';
import EstimateItemsTab from '../ui/EstimateItemsTab';
import EstimateHistoryTab from '../ui/EstimateHistoryTab';
import EstimateNotesTab from '../ui/EstimateNotesTab';
import EstimateDetailModals from '../ui/EstimateDetailModals';
import ApproveEstimateModal from '../ui/ApproveEstimateModal';
import ConvertEstimateModal from '../ui/ConvertEstimateModal';
import { viewEstimatePdf, downloadEstimatePdf } from '../useEstimatePdf';
import { cn } from '../../../shared/utils/cn';
import { FileText, History, ReceiptText } from 'lucide-react';

type DetailTab = 'items' | 'history' | 'notes';

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const estimateId = Number(id);

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
      <EstimateDetailHeader
        estimate={estimate}
        status={status}
        canSend={canSend}
        canApprove={canApprove}
        canReject={canReject}
        canConvert={canConvert}
        pdfBusy={pdfBusy}
        sendPending={sendEstimate.isPending}
        duplicatePending={duplicateEstimate.isPending}
        onSend={() => sendEstimate.mutate(estimate.id)}
        onApprove={() => setShowApprove(true)}
        onReject={() => setShowReject(true)}
        onEmail={() => setShowEmail(true)}
        onPreview={() => void handlePreview()}
        onDownload={() => void handleDownload()}
        onDuplicate={() => duplicateEstimate.mutate(estimate.id)}
        onConvert={() => setShowConvert(true)}
      />

      <EstimateStats estimate={estimate} />

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
        <EstimateItemsTab
          estimate={estimate}
          updatePending={updateEstimate.isPending}
          onValidUntilChange={(value) => {
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
                valid_until: value || null,
              },
            });
          }}
        />
      )}

      {activeTab === 'history' && <EstimateHistoryTab versions={versions} />}

      {activeTab === 'notes' && <EstimateNotesTab estimate={estimate} />}

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

      <EstimateDetailModals
        showReject={showReject}
        onCloseReject={() => setShowReject(false)}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        rejecting={rejectEstimate.isPending}
        onConfirmReject={async () => {
          await rejectEstimate.mutateAsync({ id: estimate.id, payload: { rejection_reason: rejectReason.trim() } });
          setShowReject(false);
        }}
        showEmail={showEmail}
        onCloseEmail={() => setShowEmail(false)}
        emailTo={emailTo}
        onEmailToChange={setEmailTo}
        estimate={estimate}
        emailing={emailEstimate.isPending}
        onSendEmail={() => void handleEmail()}
      />
    </div>
  );
}

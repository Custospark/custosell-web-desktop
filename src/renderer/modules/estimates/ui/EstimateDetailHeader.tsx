import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import EstimateStatusBadge from './EstimateStatusBadge';
import type { Estimate } from '../api/estimateTypes';
import type { EstimateStatus } from '../api/estimateTypes';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FolderKanban,
  Mail,
  Send,
  XCircle,
} from 'lucide-react';

interface EstimateDetailHeaderProps {
  estimate: Estimate;
  status: EstimateStatus;
  canSend: boolean;
  canApprove: boolean;
  canReject: boolean;
  canConvert: boolean;
  pdfBusy: 'preview' | 'download' | null;
  sendPending: boolean;
  duplicatePending: boolean;
  onSend: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEmail: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onConvert: () => void;
}

export default function EstimateDetailHeader({
  estimate,
  status,
  canSend,
  canApprove,
  canReject,
  canConvert,
  pdfBusy,
  sendPending,
  duplicatePending,
  onSend,
  onApprove,
  onReject,
  onEmail,
  onPreview,
  onDownload,
  onDuplicate,
  onConvert,
}: EstimateDetailHeaderProps) {
  const navigate = useNavigate();

  return (
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
              onClick={onSend}
              loading={sendPending}
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
                onClick={onApprove}
                title="Approve the proposal and optionally create invoice or project"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & convert
              </Button>
              {canReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
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
            onClick={onEmail}
            title="Send a copy of the estimate by email"
          >
            <Mail className="h-4 w-4" />
            Send by email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            loading={pdfBusy === 'preview'}
            title="Preview the estimate as a PDF document"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            loading={pdfBusy === 'download'}
            title="Download the estimate as a PDF file"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDuplicate}
            loading={duplicatePending}
            title="Create a copy of this estimate"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          {canConvert && (
            <Button
              size="sm"
              onClick={onConvert}
              title="Convert to an invoice or project"
            >
              <FolderKanban className="h-4 w-4" />
              Convert
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useApproveEstimate, useConvertEstimateToInvoice, useConvertEstimateToProject } from '../api/useEstimateQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { PipelineModalHero } from '../ui/estimatesShared';
import { CheckCircle2, FileText, FolderKanban } from 'lucide-react';
import { useToast } from '../../../app/contexts/useToast';
import { cn } from '../../../shared/utils/cn';

interface ApproveEstimateModalProps {
  open: boolean;
  onClose: () => void;
  estimateId: number;
  estimateTitle: string;
  hasBillableItems: boolean;
  hasInvoice: boolean;
  hasProject: boolean;
}

export default function ApproveEstimateModal({
  open,
  onClose,
  estimateId,
  estimateTitle,
  hasBillableItems,
  hasInvoice,
  hasProject,
}: ApproveEstimateModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const approveEstimate = useApproveEstimate();
  const convertInvoice = useConvertEstimateToInvoice();
  const convertProject = useConvertEstimateToProject();

  const [createInvoice, setCreateInvoice] = useState(hasBillableItems && !hasInvoice);
  const [createProject, setCreateProject] = useState(!hasProject);

  const isProcessing = approveEstimate.isPending || convertInvoice.isPending || convertProject.isPending;

  const handleApproveOnly = async () => {
    await approveEstimate.mutateAsync({ id: estimateId });
    showToast('success', 'Estimate approved');
    onClose();
  };

  const handleApproveAndConvert = async () => {
    await approveEstimate.mutateAsync({ id: estimateId });
    showToast('success', 'Estimate approved');

    let invoiceResult;
    let projectResult;

    if (createInvoice) {
      try {
        invoiceResult = await convertInvoice.mutateAsync(estimateId);
        showToast('success', 'Invoice created from estimate');
      } catch {
        showToast('error', 'Failed to create invoice');
      }
    }

    if (createProject) {
      try {
        projectResult = await convertProject.mutateAsync(estimateId);
        showToast('success', 'Project created from estimate');
      } catch {
        showToast('error', 'Failed to create project');
      }
    }

    onClose();

    if (invoiceResult?.invoice_id) {
      navigate(ROUTES.INVOICES.INDEX);
    } else if (projectResult?.project_id) {
      navigate(ROUTES.ESTIMATES.PROJECT_DETAIL(projectResult.project_id));
    } else {
      navigate(ROUTES.ESTIMATES.INDEX);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Approve estimate" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={CheckCircle2}
          title={`"${estimateTitle}"`}
          description="Approving this estimate confirms the proposal. You can optionally create an invoice and/or project at the same time."
          tone="emerald"
        />

        <div className="space-y-3">
          <label
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer',
              createInvoice ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <input
              type="checkbox"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              disabled={!hasBillableItems || hasInvoice}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create invoice from billable items</p>
                <p className="mt-0.5 text-xs text-gray-500">A draft invoice is created and ready to send. Sending the invoice posts revenue and receivables to accounting.</p>
                {!hasBillableItems && <p className="mt-1 text-xs text-amber-600">No billable line items to invoice.</p>}
                {hasInvoice && <p className="mt-1 text-xs text-amber-600">An invoice is already linked to this estimate.</p>}
              </div>
            </div>
          </label>

          <label
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer',
              createProject ? 'border-violet-200 bg-violet-50/60' : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <input
              type="checkbox"
              checked={createProject}
              onChange={(e) => setCreateProject(e.target.checked)}
              disabled={hasProject}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create project with job costing</p>
                <p className="mt-0.5 text-xs text-gray-500">A project is created with budget and margin from this estimate. Track tasks, timesheets, and costs against the budget.</p>
                {hasProject && <p className="mt-1 text-xs text-amber-600">A project is already linked to this estimate.</p>}
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={handleApproveOnly} loading={isProcessing}>
            <CheckCircle2 className="h-4 w-4" />
            Just approve
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleApproveAndConvert}
              loading={isProcessing}
              disabled={!createInvoice && !createProject}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve & convert
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
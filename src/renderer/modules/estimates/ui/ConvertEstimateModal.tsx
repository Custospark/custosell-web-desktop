import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Input } from '../../../shared/components/inputs/Input';
import { useConvertEstimateToInvoice, useConvertEstimateToProject } from '../api/useEstimateQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { FileText, FolderKanban } from 'lucide-react';

interface ConvertEstimateModalProps {
  open: boolean;
  onClose: () => void;
  estimateId: number;
  estimateTitle: string;
  hasInvoice?: boolean;
  hasProject?: boolean;
}

export default function ConvertEstimateModal({
  open,
  onClose,
  estimateId,
  estimateTitle,
  hasInvoice = false,
  hasProject = false,
}: ConvertEstimateModalProps) {
  const navigate = useNavigate();
  const convertInvoice = useConvertEstimateToInvoice();
  const convertProject = useConvertEstimateToProject();
  const [projectName, setProjectName] = useState(estimateTitle);

  const handleInvoice = async () => {
    const result = await convertInvoice.mutateAsync(estimateId);
    onClose();
    if (result.invoice_id) {
      navigate(ROUTES.INVOICES.INDEX);
    }
  };

  const handleProject = async () => {
    const result = await convertProject.mutateAsync(estimateId);
    onClose();
    if (result.project_id) {
      navigate(ROUTES.ESTIMATES.PROJECT_DETAIL(result.project_id));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Convert estimate">
      <p className="mb-4 text-sm text-gray-600">
        Choose how to proceed with <strong>{estimateTitle}</strong> after approval.
      </p>
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Convert to invoice</p>
              <p className="mt-0.5 text-xs text-gray-500">Creates a draft invoice from billable line items.</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={handleInvoice}
                loading={convertInvoice.isPending}
                disabled={hasInvoice}
              >
                {hasInvoice ? 'Invoice linked' : 'Create invoice'}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Convert to project</p>
              <p className="mt-0.5 text-xs text-gray-500">Starts job costing with budget from this estimate.</p>
              {!hasProject && (
                <Input
                  label="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-2"
                />
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={handleProject}
                loading={convertProject.isPending}
                disabled={hasProject}
              >
                {hasProject ? 'Project linked' : 'Create project'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

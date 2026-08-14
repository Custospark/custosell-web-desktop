import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Input } from '../../../shared/components/inputs/Input';
import { useConvertEstimateToInvoice, useConvertEstimateToProject } from '../api/useEstimateQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { PipelineModalHero, PipelineFormSection } from '../ui/estimatesShared';
import { FileText, FolderKanban, ArrowRight } from 'lucide-react';

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
    <Modal isOpen={open} onClose={onClose} title="Convert estimate" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={ArrowRight}
          title={`Convert "${estimateTitle}"`}
          description="Choose how to proceed after approval - create an invoice or start a project with built-in job costing."
          tone="indigo"
        />

        <PipelineFormSection title="Convert to invoice" icon={FileText}>
          <p className="text-sm text-gray-600">
            Creates a draft invoice from all billable line items. You can review and send it from the invoices section.
          </p>
          <Button
            size="sm"
            onClick={handleInvoice}
            loading={convertInvoice.isPending}
            disabled={hasInvoice}
            className="inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {hasInvoice ? 'Invoice already linked' : 'Create invoice'}
          </Button>
        </PipelineFormSection>

        <PipelineFormSection title="Convert to project" icon={FolderKanban}>
          <p className="text-sm text-gray-600">
            Starts a project with budget and margin from this estimate. Track tasks, timesheets, and actual costs against the budget.
          </p>
          {!hasProject && (
            <Input
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleProject}
            loading={convertProject.isPending}
            disabled={hasProject}
            className="inline-flex items-center gap-2"
          >
            <FolderKanban className="h-4 w-4" />
            {hasProject ? 'Project already linked' : 'Create project'}
          </Button>
        </PipelineFormSection>
      </div>
    </Modal>
  );
}
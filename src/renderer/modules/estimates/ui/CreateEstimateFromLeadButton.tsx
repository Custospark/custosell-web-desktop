import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreateEstimate } from '../api/useEstimateQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { FileSpreadsheet } from 'lucide-react';
import type { PipelineBoard, PipelineLead } from '../../pipeline/api/pipelineTypes';
import { pipelineKeys } from '../../pipeline/api/usePipelineQueries';
import { updateLeadOnKanban } from '../../pipeline/api/pipelineKanbanCache';

interface CreateEstimateFromLeadButtonProps {
  lead: PipelineLead;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

function resolveLeadCustomerId(lead: PipelineLead): number | null {
  return (
    lead.customer_id
    ?? lead.customer?.id
    ?? lead.converted_customer_id
    ?? lead.converted_customer?.id
    ?? null
  );
}

export default function CreateEstimateFromLeadButton({
  lead,
  size = 'sm',
  variant = 'outline',
  className,
}: CreateEstimateFromLeadButtonProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createEstimate = useCreateEstimate();

  const customerId = resolveLeadCustomerId(lead);

  const syncLeadEstimateLink = (estimateId: number) => {
    qc.setQueryData<PipelineLead>(pipelineKeys.lead(lead.id), (old) =>
      old ? { ...old, estimate_id: estimateId } : old,
    );
    if (lead.board_id) {
      qc.setQueryData<PipelineBoard>(pipelineKeys.kanban(lead.board_id), (old) =>
        old ? updateLeadOnKanban(old, lead.id, { estimate_id: estimateId }) : old,
      );
    }
    void qc.invalidateQueries({ queryKey: pipelineKeys.lead(lead.id) });
    void qc.invalidateQueries({ queryKey: pipelineKeys.leads() });
    if (lead.board_id) {
      void qc.invalidateQueries({ queryKey: pipelineKeys.kanban(lead.board_id) });
    }
  };

  const handleCreate = async () => {
    const estimate = await createEstimate.mutateAsync({
      title: lead.title,
      customer_id: customerId,
      pipeline_lead_id: lead.id,
      currency: lead.currency || undefined,
      notes: lead.description ?? undefined,
      line_items: lead.estimated_value
        ? [{
            description: 'Estimated scope from pipeline',
            quantity: 1,
            unit_cost: 0,
            unit_price: lead.estimated_value,
            markup_type: 'none',
            type: 'other',
          }]
        : [{ description: 'Scope of work', quantity: 1, unit_cost: 0, unit_price: 0, markup_type: 'none', type: 'other' }],
    });
    syncLeadEstimateLink(estimate.id);
    navigate(ROUTES.ESTIMATES.DETAIL(estimate.id));
  };

  if (lead.estimate_id) {
    return (
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => navigate(ROUTES.ESTIMATES.DETAIL(lead.estimate_id!))}
      >
        <FileSpreadsheet className="h-4 w-4" />
        View estimate
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={handleCreate}
      loading={createEstimate.isPending}
    >
      <FileSpreadsheet className="h-4 w-4" />
      Create estimate
    </Button>
  );
}

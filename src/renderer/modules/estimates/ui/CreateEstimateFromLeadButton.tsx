import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreateEstimate } from '../api/useEstimateQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { FileSpreadsheet } from 'lucide-react';
import type { PipelineLead } from '../../pipeline/api/pipelineTypes';

interface CreateEstimateFromLeadButtonProps {
  lead: PipelineLead;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

export default function CreateEstimateFromLeadButton({
  lead,
  size = 'sm',
  variant = 'outline',
  className,
}: CreateEstimateFromLeadButtonProps) {
  const navigate = useNavigate();
  const createEstimate = useCreateEstimate();

  const customerId = lead.customer_id ?? lead.customer?.id ?? lead.converted_customer?.id ?? null;
  const canCreate = Boolean(customerId) || lead.status === 'converted' || Boolean(lead.contact_name);

  if (!canCreate) return null;

  const handleCreate = async () => {
    const estimate = await createEstimate.mutateAsync({
      title: lead.title,
      customer_id: customerId,
      pipeline_lead_id: lead.id,
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

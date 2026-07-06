import { cn } from '../../../shared/utils/cn';
import type { PipelineLeadStatus } from '../api/pipelineTypes';

const STATUS_STYLES: Record<PipelineLeadStatus, string> = {
  open: 'bg-blue-50 text-blue-800 ring-blue-100',
  won: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  lost: 'bg-red-50 text-red-800 ring-red-100',
  converted: 'bg-violet-50 text-violet-800 ring-violet-100',
  archived: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const STATUS_LABELS: Record<PipelineLeadStatus, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
  archived: 'Archived',
};

export function PipelineStatusBadge({ status }: { status: PipelineLeadStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

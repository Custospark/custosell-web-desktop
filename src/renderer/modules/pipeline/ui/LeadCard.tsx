import type { PipelineLead } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import { pipelineInitials } from './pipelineFormFields';
import { GripVertical, Mail, Phone, Tag } from 'lucide-react';

interface LeadCardProps {
  lead: PipelineLead;
  stageColor?: string | null;
  onClick: () => void;
  dragging?: boolean;
}

export default function LeadCard({ lead, stageColor, onClick, dragging }: LeadCardProps) {
  const displayName = lead.contact_name || lead.title;
  const accent = stageColor ?? lead.stage?.color ?? '#6366f1';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'group relative w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200/90 bg-white text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md',
        dragging && 'rotate-1 opacity-60 shadow-lg',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />

      <div className="p-3 pl-3.5">
        <div className="flex items-start gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: `${accent}dd` }}
          >
            {pipelineInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 pr-5 text-sm font-semibold leading-snug text-gray-900">{lead.title}</p>
            {lead.contact_name && lead.contact_name !== lead.title && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{lead.contact_name}</p>
            )}
          </div>
          <GripVertical className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {(lead.contact_phone || lead.contact_email) && (
          <div className="mt-2.5 space-y-1">
            {lead.contact_phone && (
              <p className="flex items-center gap-1.5 truncate text-xs text-gray-600">
                <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                {lead.contact_phone}
              </p>
            )}
            {lead.contact_email && (
              <p className="flex items-center gap-1.5 truncate text-xs text-gray-600">
                <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                {lead.contact_email}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {lead.estimated_value != null && lead.estimated_value > 0 && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              {formatCurrency(lead.estimated_value, lead.currency)}
            </span>
          )}
          {lead.source && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <Tag className="h-2.5 w-2.5" />
              {lead.source.name}
            </span>
          )}
          {lead.assignee && (
            <span
              className="ml-auto inline-flex max-w-[100px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800"
              title={lead.assignee.name}
            >
              {lead.assignee.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import type { PipelineLead } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { pipelineInitials } from './pipelineFormFields';
import {
  GripVertical, Calendar, Mail, Phone, Tag, Paperclip, CheckSquare, Briefcase, Kanban,
} from 'lucide-react';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';

interface LeadCardProps {
  lead: PipelineLead;
  stageColor?: string | null;
  onClick: () => void;
  dragging?: boolean;
}

const PRIORITY_COLORS = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function LeadCard({ lead, stageColor, onClick, dragging }: LeadCardProps) {
  const displayName = lead.contact_name || lead.title;
  const accent = stageColor ?? lead.stage?.color ?? '#6366f1';
  const isCard = (lead.card_type ?? 'lead') === 'card';
  const dueDate = lead.due_date ?? lead.expected_close_date;
  const overdue = isOverdue(dueDate);
  const checklistTotal = lead.checklist_total ?? 0;
  const checklistDone = lead.checklist_done ?? 0;
  const attachmentsCount = lead.attachments_count ?? 0;

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
        overdue && 'border-red-200/80',
        !lead.background_color && 'bg-white',
      )}
      style={lead.background_color ? { backgroundColor: lead.background_color } : undefined}
    >
      {(lead.labels ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pt-2">
          {(lead.labels ?? []).map((label) => (
            <span
              key={label.id}
              className="h-2 min-w-[40px] flex-1 rounded-sm"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />

      <div className="p-3 pl-3.5">
        <div className="flex items-start gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: `${accent}dd` }}
          >
            {isCard ? <Kanban className="h-4 w-4" /> : pipelineInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 pr-5 text-sm font-semibold leading-snug text-gray-900">{lead.title}</p>
            {lead.description && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{lead.description}</p>
            )}
            {!isCard && lead.contact_name && lead.contact_name !== lead.title && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{lead.contact_name}</p>
            )}
          </div>
          <GripVertical className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {!isCard && (lead.contact_phone || lead.contact_email) && (
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
          {lead.priority && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }}
            >
              {lead.priority}
            </span>
          )}
          {dueDate && (
            <span className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1',
              overdue ? 'bg-red-50 text-red-800 ring-red-100' : 'bg-amber-50 text-amber-800 ring-amber-100',
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {formatShiftDate(dueDate)}
            </span>
          )}
          {lead.estimated_value != null && lead.estimated_value > 0 && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              {formatCurrency(lead.estimated_value, lead.currency)}
            </span>
          )}
          {isCard && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
              <Briefcase className="h-2.5 w-2.5" />
              Project
            </span>
          )}
          {lead.source && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <Tag className="h-2.5 w-2.5" />
              {lead.source.name}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-medium',
              checklistDone === checklistTotal ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600',
            )}>
              <CheckSquare className="h-2.5 w-2.5" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {attachmentsCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <Paperclip className="h-2.5 w-2.5" />
              {attachmentsCount}
            </span>
          )}
          {lead.assignee && (
            <UserIdentityChip
              name={lead.assignee.name}
              avatar={lead.assignee.avatar}
              size="xs"
              className="ml-auto max-w-[108px] rounded-full bg-gray-50 py-0.5 pl-0.5 pr-2 ring-1 ring-gray-100"
            />
          )}
        </div>
      </div>
    </div>
  );
}

import { Briefcase, Kanban } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import type { PipelineCalendarLead } from '../api/pipelineTypes';
import { DATE_KIND_STYLES, formatTimeAmPm, PRIORITY_DOT } from './calendarViewShared';

export function CalendarLeadChip({
  lead,
  showDateKind,
  onClick,
  compact = false,
}: {
  lead: PipelineCalendarLead;
  showDateKind: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const stageColor = lead.stage?.color ?? '#6366f1';
  const kind = lead.date_kind ? DATE_KIND_STYLES[lead.date_kind] : null;

  if (compact) {
    return (
      <span
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/80"
        style={{ backgroundColor: stageColor }}
        title={lead.title}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'block w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white shadow-sm ring-1 ring-inset transition hover:brightness-95',
        showDateKind && kind?.ring,
      )}
      style={{ backgroundColor: stageColor }}
    >
      <span className="line-clamp-2 leading-snug">{lead.title}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] opacity-90">
        {lead.card_type === 'card' ? (
          <Kanban className="h-2.5 w-2.5 shrink-0" />
        ) : (
          <Briefcase className="h-2.5 w-2.5 shrink-0" />
        )}
        {formatTimeAmPm(lead.time) && <span className="font-semibold">{formatTimeAmPm(lead.time)}</span>}
        {showDateKind && kind && <span>{kind.label}</span>}
        {lead.priority && (
          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[lead.priority] ?? 'bg-white/70')} />
        )}
        {lead.estimated_value != null && lead.estimated_value > 0 && (
          <span className="whitespace-normal break-words">{formatCurrency(lead.estimated_value, lead.currency)}</span>
        )}
      </span>
    </button>
  );
}

import type { PipelineLead } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import { pipelineInitials } from './pipelineFormFields';
import {
  GripVertical, Calendar, Mail, Phone, Tag, Paperclip, CheckSquare, Briefcase, Kanban, MessageSquare, History, Check, Copy, ArrowRightLeft, Pin, PinOff,
} from 'lucide-react';
import LeadAssignmentChain from './LeadAssignmentChain';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';

interface LeadCardProps {
  lead: PipelineLead;
  stageColor?: string | null;
  onClick: () => void;
  onCommentsClick?: (lead: PipelineLead) => void;
  onCopyClick?: (lead: PipelineLead) => void;
  onMoveClick?: (lead: PipelineLead) => void;
  onHistoryClick?: (lead: PipelineLead) => void;
  onPinClick?: (lead: PipelineLead) => void;
  onToggleComplete?: (lead: PipelineLead, complete: boolean) => void;
  dragging?: boolean;
  showDragHandle?: boolean;
  isProjectBoard?: boolean;
}

const PRIORITY_COLORS = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const d = new Date(dateStr.slice(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }
  return new Date(dateStr) < new Date();
}

export default function LeadCard({
  lead,
  stageColor,
  onClick,
  onCommentsClick,
  onCopyClick,
  onMoveClick,
  onHistoryClick,
  onPinClick,
  onToggleComplete,
  dragging,
  showDragHandle = false,
  isProjectBoard = false,
}: LeadCardProps) {
  const displayName = lead.contact_name || lead.title;
  const accent = stageColor ?? lead.stage?.color ?? '#6366f1';
  const isCard = (lead.card_type ?? 'lead') === 'card';
  const isComplete = lead.status === 'won';
  const dueDate = lead.due_date ?? lead.expected_close_date;
  const overdue = !isComplete && lead.status === 'open' && isOverdue(dueDate);
  const checklistTotal = lead.checklist_total ?? 0;
  const checklistDone = lead.checklist_done ?? 0;
  const attachmentsCount = lead.attachments_count ?? 0;
  const commentsCount = lead.comments_count ?? 0;
  const historyCount = lead.history_count ?? 0;

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
        isComplete && 'bg-gray-50/80',
        !lead.background_color && 'bg-white',
      )}
      style={lead.background_color ? { backgroundColor: lead.background_color } : undefined}
    >
      {(lead.labels ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pt-3">
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

      <div className="relative min-h-[7rem] p-3 pl-3.5 pr-[52px]">
        <div className="flex items-start gap-2">
          {onToggleComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(lead, !isComplete);
              }}
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                isComplete
                  ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'border-gray-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50',
              )}
              title={isComplete ? `Mark ${isProjectBoard ? 'task' : 'lead'} incomplete` : `Mark ${isProjectBoard ? 'task' : 'lead'} complete`}
              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
          )}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: `${accent}dd` }}
          >
            {isCard ? <Kanban className="h-4 w-4" /> : pipelineInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              'line-clamp-2 text-sm font-semibold leading-snug text-gray-900',
              isComplete && 'text-gray-500 line-through decoration-gray-400',
            )}>{lead.title}</p>
            {lead.description && (
              <div className="mt-1 line-clamp-2 text-xs text-gray-500 prose prose-sm max-w-none prose-p:my-0 prose-p:inline prose-p:text-xs prose-strong:text-gray-600 prose-a:text-indigo-600 prose-code:text-xs" dangerouslySetInnerHTML={{ __html: lead.description }} />
            )}
            {!isCard && lead.contact_name && lead.contact_name !== lead.title && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{lead.contact_name}</p>
            )}
          </div>
          {showDragHandle && (
            <span className="shrink-0" title={isProjectBoard ? 'Drag card' : 'Drag lead'}>
              <GripVertical className="h-4 w-4 text-gray-400" />
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-0">
          {onPinClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPinClick(lead);
              }}
              className={cn(
                'rounded-lg p-1 text-gray-400 transition-colors',
                lead.is_pinned
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  : 'hover:bg-amber-50 hover:text-amber-600',
              )}
              title={lead.is_pinned ? 'Unpin from top' : 'Pin to top'}
              aria-label={lead.is_pinned ? 'Unpin' : 'Pin'}
            >
              {lead.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHistoryClick?.(lead);
            }}
            className={cn(
              'relative rounded-lg p-1 text-gray-400 transition-colors',
              'hover:bg-violet-50 hover:text-violet-600',
              historyCount > 0 && 'text-violet-500',
            )}
            title={historyCount > 0 ? `${historyCount} histor${historyCount === 1 ? 'y event' : 'y events'}` : 'Card history'}
            aria-label="View card history"
          >
            <History className="h-4 w-4" />
            {historyCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-600 px-[3px] text-[8px] font-bold leading-none text-white ring-2 ring-white">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCommentsClick?.(lead);
            }}
            className={cn(
              'relative rounded-lg p-1 text-gray-400 transition-colors',
              'hover:bg-blue-50 hover:text-blue-600',
              commentsCount > 0 && 'text-blue-500',
            )}
            title={commentsCount > 0 ? `${commentsCount} comment${commentsCount === 1 ? '' : 's'}` : 'Comments'}
            aria-label="View comments"
          >
            <MessageSquare className="h-4 w-4" />
            {commentsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-[3px] text-[8px] font-bold leading-none text-white ring-2 ring-white">
                {commentsCount > 99 ? '99+' : commentsCount}
              </span>
            )}
          </button>
          {onMoveClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveClick(lead);
              }}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              title={isProjectBoard ? 'Move card' : 'Move lead'}
              aria-label="Move"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          )}
          {onCopyClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyClick(lead);
              }}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title={isProjectBoard ? 'Duplicate card' : 'Duplicate lead'}
              aria-label="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
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
              overdue ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-100',
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {overdue ? 'Overdue · ' : ''}{formatShiftDateTime(dueDate)}
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
          {(lead.assignees?.length || lead.assignee) && (
            <div className="ml-auto min-w-0 max-w-full">
              <LeadAssignmentChain
                creator={lead.creator}
                assignee={lead.assignee}
                assignees={lead.assignees}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

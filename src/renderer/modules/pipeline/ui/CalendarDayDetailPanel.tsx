import { forwardRef } from 'react';
import { Calendar, LayoutGrid } from 'lucide-react';
import { Card } from '../../../shared/components/cards/Card';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import type { PipelineCalendarLead } from '../api/pipelineTypes';
import { PipelineStatusBadge } from './pipelineStatusBadge';
import { DATE_KIND_STYLES, formatTimeAmPm, sortByTime } from './calendarViewShared';

interface CalendarDayDetailPanelProps {
  selectedDate: string | null;
  leads: PipelineCalendarLead[];
  showDateKind: boolean;
  scope: 'board' | 'all';
  onLeadClick: (leadId: number) => void;
}

const CalendarDayDetailPanel = forwardRef<HTMLDivElement, CalendarDayDetailPanelProps>(
  function CalendarDayDetailPanel({ selectedDate, leads, showDateKind, scope, onLeadClick }, ref) {
    return (
      <div ref={ref} className="w-full scroll-mt-3 lg:sticky lg:top-3 lg:w-80 xl:w-96">
        <Card
          className={cn(
            'flex w-full flex-col !p-0',
            selectedDate && 'ring-2 ring-indigo-200 lg:ring-0',
          )}
        >
          <div className="border-b border-gray-100 px-3 py-3 sm:px-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedDate ? formatShiftDate(selectedDate) : 'Select a day'}
            </h3>
            <p className="text-xs text-gray-500">
              {selectedDate
                ? `${leads.length} item${leads.length === 1 ? '' : 's'} scheduled`
                : 'Tap a day to see scheduled items'}
            </p>
          </div>
          <div className="max-h-none flex-1 overflow-y-auto p-2 sm:max-h-[420px] sm:p-3 lg:max-h-[calc(100vh-18rem)]">
            {!selectedDate && (
              <p className="py-6 text-center text-sm text-gray-500 sm:py-8">No day selected</p>
            )}
            {selectedDate && leads.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500 sm:py-8">Nothing scheduled this day</p>
            )}
            {sortByTime(leads).map((lead) => (
              <button
                key={`${lead.id}-${lead.date_kind ?? 'detail'}`}
                type="button"
                onClick={() => onLeadClick(lead.id)}
                className="mb-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 whitespace-normal break-words font-medium text-gray-900">{lead.title}</p>
                  <PipelineStatusBadge status={lead.status} />
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {lead.stage && (
                    <p className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: lead.stage.color ?? '#94a3b8' }} />
                      {lead.stage.name}
                    </p>
                  )}
                  {scope === 'all' && lead.board && (
                    <p className="flex items-center gap-1.5">
                      <LayoutGrid className="h-3 w-3 text-gray-400" />
                      {lead.board.name}
                    </p>
                  )}
                  {lead.assignee && (
                    <UserIdentityChip
                      name={lead.assignee.name}
                      avatar={lead.assignee.avatar}
                      size="xs"
                      className="max-w-full"
                    />
                  )}
                  {showDateKind && lead.date_kind && (
                    <p>{DATE_KIND_STYLES[lead.date_kind]?.label ?? lead.date_kind} date</p>
                  )}
                  {formatTimeAmPm(lead.time) && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {formatTimeAmPm(lead.time)}
                    </p>
                  )}
                  {lead.estimated_value != null && lead.estimated_value > 0 && (
                    <p className="whitespace-normal break-words font-medium text-emerald-700">
                      {formatCurrency(lead.estimated_value, lead.currency)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  },
);

export default CalendarDayDetailPanel;

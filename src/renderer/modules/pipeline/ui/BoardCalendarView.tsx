import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Briefcase, Calendar, CalendarDays, ChevronLeft, ChevronRight, Kanban, LayoutGrid,
} from 'lucide-react';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { usePipelineCalendar, useAllBoardsCalendar } from '../api/usePipelineQueries';
import type { PipelineCalendarDateField, PipelineCalendarLead } from '../api/pipelineTypes';
import { PipelineStatusBadge } from './pipelineStatusBadge';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import {
  buildMonthCells,
  CALENDAR_WEEKDAYS,
  CALENDAR_WEEKDAYS_SHORT,
  formatCalendarHeading,
  isPastDate,
  isWeekend,
  toDateKey,
} from './calendarUtils';

interface BoardCalendarViewProps {
  boardId: number;
  onLeadClick: (leadId: number) => void;
  isProjectBoard?: boolean;
  workspace?: 'pipeline' | 'estimates';
}

const DATE_FIELD_OPTIONS: { value: PipelineCalendarDateField; label: string; shortLabel: string; hint: string }[] = [
  { value: 'due', label: 'Due dates', shortLabel: 'Due', hint: 'Due date or expected close' },
  { value: 'start', label: 'Start dates', shortLabel: 'Start', hint: 'When work begins' },
  { value: 'close', label: 'Close dates', shortLabel: 'Close', hint: 'Expected close only' },
  { value: 'all', label: 'All dates', shortLabel: 'All', hint: 'Start, due, and close' },
];

const DATE_KIND_STYLES: Record<string, { ring: string; label: string }> = {
  start: { ring: 'ring-sky-300', label: 'Start' },
  due: { ring: 'ring-amber-300', label: 'Due' },
  close: { ring: 'ring-violet-300', label: 'Close' },
};

function formatTimeAmPm(time: string | null | undefined): string | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function sortByTime(leads: PipelineCalendarLead[]): PipelineCalendarLead[] {
  return [...leads].sort((a, b) => {
    const ta = a.time ?? '';
    const tb = b.time ?? '';
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

function CalendarLeadChip({
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

export default function BoardCalendarView({ boardId, onLeadClick, isProjectBoard = false, workspace = 'pipeline' }: BoardCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [dateField, setDateField] = useState<PipelineCalendarDateField>('due');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scope, setScope] = useState<'board' | 'all'>('board');
  const dayDetailRef = useRef<HTMLDivElement>(null);

  const { data: boardDays = [], isLoading: boardLoading } = usePipelineCalendar(boardId, year, month, dateField);
  const { data: allDays = [], isLoading: allLoading } = useAllBoardsCalendar(year, month, workspace, dateField);

  const days = scope === 'all' ? allDays : boardDays;
  const isLoading = scope === 'all' ? allLoading : boardLoading;

  const leadsByDate = useMemo(() => {
    const map = new Map<string, PipelineCalendarLead[]>();
    for (const day of days) {
      map.set(day.date, day.leads);
    }
    return map;
  }, [days]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const monthStats = useMemo(() => {
    const allLeads = days.flatMap((d) => d.leads);
    const uniqueIds = new Set(allLeads.map((l) => l.id));
    const overdue = days
      .filter((d) => isPastDate(d.date, todayKey))
      .flatMap((d) => d.leads)
      .filter((l) => l.status === 'open').length;
    const value = allLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);

    return {
      items: uniqueIds.size,
      entries: allLeads.length,
      overdue,
      value,
    };
  }, [days, todayKey]);

  const cells = buildMonthCells(year, month);
  const selectedLeads = selectedDate ? (leadsByDate.get(selectedDate) ?? []) : [];
  const showDateKind = dateField === 'all';

  useEffect(() => {
    if (!selectedDate || !dayDetailRef.current) return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return;
    dayDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedDate, selectedLeads.length]);

  const goPrev = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const goNext = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(todayKey);
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
            <CalendarDays className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="truncate">{formatCalendarHeading(year, month)}</span>
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {DATE_FIELD_OPTIONS.find((o) => o.value === dateField)?.hint}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
          <Button type="button" variant="secondary" size="sm" onClick={goToday} className="col-span-1 w-full sm:w-auto">
            Today
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={goPrev} aria-label="Previous month" className="w-full sm:w-auto">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={goNext} aria-label="Next month" className="w-full sm:w-auto">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {DATE_FIELD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setDateField(opt.value); setSelectedDate(null); }}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:py-1.5',
              dateField === opt.value
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50',
            )}
          >
            <span className="sm:hidden">{opt.shortLabel}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="text-xs font-medium text-gray-500">View:</span>
        <button
          type="button"
          onClick={() => setScope('board')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            scope === 'board'
              ? 'bg-indigo-100 text-indigo-800'
              : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          This board
        </button>
        <button
          type="button"
          onClick={() => setScope('all')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            scope === 'all'
              ? 'bg-indigo-100 text-indigo-800'
              : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          All {workspace === 'estimates' ? 'project boards' : 'pipeline boards'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: 'Unique cards', short: 'Cards', value: String(monthStats.items) },
          { label: 'Calendar entries', short: 'Entries', value: String(monthStats.entries) },
          { label: `Overdue open ${isProjectBoard ? 'tasks' : 'leads'}`, short: 'Overdue', value: String(monthStats.overdue), warn: monthStats.overdue > 0 },
          { label: `${isProjectBoard ? 'Project' : 'Pipeline'} value`, short: 'Value', value: formatCurrency(monthStats.value), wrap: true },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <span className="sm:hidden">{stat.short}</span>
              <span className="hidden sm:inline">{stat.label}</span>
            </p>
            <p className={cn(
              'mt-0.5 text-base font-semibold sm:text-lg',
              stat.warn ? 'text-red-600' : 'text-gray-900',
              stat.wrap && 'whitespace-normal break-words text-sm leading-snug sm:text-base',
            )}
            >
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <CustosellLoader />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
              {CALENDAR_WEEKDAYS.map((wd, i) => (
                <div key={wd} className="px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-2 sm:text-[11px]">
                  <span className="sm:hidden">{CALENDAR_WEEKDAYS_SHORT[i]}</span>
                  <span className="hidden sm:inline">{wd}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, idx) => {
                if (cell.day == null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[4.5rem] border-b border-r border-gray-100 bg-gray-50/50 sm:min-h-[6.5rem] md:min-h-[6.75rem] lg:min-h-[7rem]"
                    />
                  );
                }
                const dateKey = cell.dateKey!;
                const dayLeads = leadsByDate.get(dateKey) ?? [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const overdue = isPastDate(dateKey, todayKey)
                  && dayLeads.some((l) => l.status === 'open');

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleSelectDate(dateKey)}
                    className={cn(
                      'flex min-h-[4.5rem] flex-col border-b border-r border-gray-100 p-1 text-left transition-colors sm:min-h-[6.5rem] sm:p-1.5 md:min-h-[6.75rem] lg:min-h-[7rem]',
                      isWeekend(dateKey) && 'bg-slate-50/80',
                      isToday && 'bg-blue-50/70',
                      isSelected && 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-400',
                      !isSelected && 'hover:bg-gray-50/80',
                    )}
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-0.5 sm:mb-1 sm:gap-1">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs',
                          isToday ? 'bg-blue-600 text-white' : 'text-gray-700',
                        )}
                      >
                        {cell.day}
                      </span>
                      <div className="flex min-w-0 items-center gap-0.5">
                        {overdue && (
                          <AlertCircle className="h-3 w-3 shrink-0 text-red-500 sm:h-3.5 sm:w-3.5" aria-label="Has overdue items" />
                        )}
                        {dayLeads.length > 0 && (
                          <span className="rounded-full bg-gray-200 px-1 py-0.5 text-[9px] font-semibold text-gray-700 sm:px-1.5 sm:text-[10px]">
                            {dayLeads.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile: compact dots */}
                    <div className="mt-auto flex flex-wrap gap-0.5 md:hidden">
                      {dayLeads.slice(0, 4).map((lead) => (
                        <CalendarLeadChip
                          key={`${lead.id}-${lead.date_kind ?? 'dot'}`}
                          lead={lead}
                          showDateKind={showDateKind}
                          onClick={() => onLeadClick(lead.id)}
                          compact
                        />
                      ))}
                      {dayLeads.length > 4 && (
                        <span className="text-[9px] font-medium text-gray-500">+{dayLeads.length - 4}</span>
                      )}
                    </div>

                    {/* Tablet+: full chips */}
                    <div className="mt-auto hidden space-y-1 md:block">
                      {dayLeads.slice(0, 2).map((lead) => (
                        <CalendarLeadChip
                          key={`${lead.id}-${lead.date_kind ?? 'x'}`}
                          lead={lead}
                          showDateKind={showDateKind}
                          onClick={() => onLeadClick(lead.id)}
                        />
                      ))}
                      {dayLeads.length > 2 && (
                        <p className="px-1 text-[10px] font-medium text-gray-500">+{dayLeads.length - 2} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={dayDetailRef} className="w-full scroll-mt-3 lg:sticky lg:top-3 lg:w-80 xl:w-96">
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
                  ? `${selectedLeads.length} item${selectedLeads.length === 1 ? '' : 's'} scheduled`
                  : 'Tap a day to see scheduled items'}
              </p>
            </div>
            <div className="max-h-none flex-1 overflow-y-auto p-2 sm:max-h-[420px] sm:p-3 lg:max-h-[calc(100vh-18rem)]">
              {!selectedDate && (
                <p className="py-6 text-center text-sm text-gray-500 sm:py-8">No day selected</p>
              )}
              {selectedDate && selectedLeads.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-500 sm:py-8">Nothing scheduled this day</p>
              )}
              {sortByTime(selectedLeads).map((lead) => (
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
        </div>
      )}

      {showDateKind && (
        <div className="-mx-2 flex flex-wrap items-center gap-2 overflow-x-auto px-2 pb-1 text-xs text-gray-500 sm:mx-0 sm:gap-3 sm:px-0">
          <span className="shrink-0 font-medium text-gray-700">Legend:</span>
          {Object.entries(DATE_KIND_STYLES).map(([key, style]) => (
            <span key={key} className="inline-flex shrink-0 items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full ring-2', style.ring)} />
              {style.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

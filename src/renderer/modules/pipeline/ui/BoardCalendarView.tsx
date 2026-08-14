import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { usePipelineCalendar, useAllBoardsCalendar } from '../api/usePipelineQueries';
import type { PipelineCalendarDateField, PipelineCalendarLead } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
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
import { CalendarLeadChip } from './CalendarLeadChip';
import CalendarViewToolbar from './CalendarViewToolbar';
import CalendarDayDetailPanel from './CalendarDayDetailPanel';
import { DATE_KIND_STYLES, DATE_FIELD_OPTIONS } from './calendarViewShared';

interface BoardCalendarViewProps {
  boardId: number;
  onLeadClick: (leadId: number) => void;
  isProjectBoard?: boolean;
  workspace?: 'pipeline' | 'estimates';
}

export default function BoardCalendarView({ boardId, onLeadClick, isProjectBoard = false, workspace = 'pipeline' }: BoardCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [dateField, setDateField] = useState<PipelineCalendarDateField>('due');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scope, setScope] = useState<'board' | 'all'>('board');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
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

  const monthCells = buildMonthCells(year, month);

  const weekStart = useMemo(() => {
    const d = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return toDateKey(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
  }, [selectedDate]);

  const cells = useMemo(() => {
    if (viewMode === 'month') return monthCells;
    const makeDays = (startDate: Date, count: number) => {
      const result: { day: number; dateKey: string; year: number; month: number }[] = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
        result.push({ day, dateKey: toDateKey(y, m, day), year: y, month: m });
      }
      return result;
    };
    if (viewMode === 'week') {
      return makeDays(new Date(weekStart + 'T12:00:00'), 7);
    }
    if (viewMode === 'day') {
      const base = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
      return makeDays(base, 1);
    }
    return monthCells;
  }, [viewMode, monthCells, weekStart, selectedDate, today]);

  const selectedLeads = selectedDate ? (leadsByDate.get(selectedDate) ?? []) : [];
  const showDateKind = dateField === 'all';
  const dateFieldHint = DATE_FIELD_OPTIONS.find((o) => o.value === dateField)?.hint;

  useEffect(() => {
    if (!selectedDate || !dayDetailRef.current) return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return;
    dayDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedDate, selectedLeads.length]);

  const shiftDate = (days: number) => {
    const base = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + days);
    setYear(base.getFullYear());
    setMonth(base.getMonth() + 1);
    setSelectedDate(toDateKey(base.getFullYear(), base.getMonth() + 1, base.getDate()));
  };

  const goPrev = () => {
    if (viewMode === 'month') {
      if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1);
      setSelectedDate(null);
    } else if (viewMode === 'week') {
      shiftDate(-7);
    } else {
      shiftDate(-1);
    }
  };

  const goNext = () => {
    if (viewMode === 'month') {
      if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1);
      setSelectedDate(null);
    } else if (viewMode === 'week') {
      shiftDate(7);
    } else {
      shiftDate(1);
    }
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
            <span className="truncate">
              {viewMode === 'day' && selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : viewMode === 'week' && selectedDate
                  ? `Week of ${new Date(weekStart + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                  : formatCalendarHeading(year, month)}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {dateFieldHint}
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

      <CalendarViewToolbar
        scope={scope}
        onScopeChange={(next) => { setScope(next); setSelectedDate(null); }}
        dateField={dateField}
        onDateFieldChange={(next) => { setDateField(next); setSelectedDate(null); }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        workspace={workspace}
      />

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
            <div className={cn('grid border-b border-gray-100 bg-gray-50', viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
              {(viewMode === 'day' ? ['Day'] : CALENDAR_WEEKDAYS).map((wd, i) => (
                <div key={wd} className="px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-2 sm:text-[11px]">
                  {viewMode === 'day' ? (
                    selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Today'
                  ) : (
                    <><span className="sm:hidden">{CALENDAR_WEEKDAYS_SHORT[i]}</span><span className="hidden sm:inline">{wd}</span></>
                  )}
                </div>
              ))}
            </div>
            <div className={cn('grid', viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
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

          <CalendarDayDetailPanel
            ref={dayDetailRef}
            selectedDate={selectedDate}
            leads={selectedLeads}
            showDateKind={showDateKind}
            scope={scope}
            onLeadClick={onLeadClick}
          />
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

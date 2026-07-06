import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { usePipelineCalendar } from '../api/usePipelineQueries';
import type { PipelineCalendarLead } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';

interface BoardCalendarViewProps {
  boardId: number;
  onLeadClick: (leadId: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function BoardCalendarView({ boardId, onLeadClick }: BoardCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data: days = [], isLoading } = usePipelineCalendar(boardId, year, month);

  const leadsByDate = useMemo(() => {
    const map = new Map<string, PipelineCalendarLead[]>();
    for (const day of days) {
      map.set(day.date, day.leads);
    }
    return map;
  }, [days]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const goPrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells: Array<{ day: number | null; dateKey?: string }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: toDateKey(year, month, d) });
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
          <p className="text-xs text-gray-500">Leads by expected close date</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={goNext} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {cells.map((cell, idx) => {
              if (cell.day == null) {
                return <div key={`empty-${idx}`} className="min-h-[88px] border-b border-r border-gray-100 bg-gray-50/40" />;
              }
              const dateKey = cell.dateKey!;
              const dayLeads = leadsByDate.get(dateKey) ?? [];
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-[88px] border-b border-r border-gray-100 p-1.5',
                    isToday && 'bg-blue-50/50',
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday ? 'bg-blue-600 text-white' : 'text-gray-700',
                    )}
                  >
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeads.slice(0, 3).map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => onLeadClick(lead.id)}
                        className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{ backgroundColor: lead.stage?.color ?? '#6366f1' }}
                        title={lead.title}
                      >
                        {lead.title}
                        {lead.estimated_value != null && lead.estimated_value > 0 && (
                          <span className="ml-1 opacity-90">
                            · {formatCurrency(lead.estimated_value, lead.currency)}
                          </span>
                        )}
                      </button>
                    ))}
                    {dayLeads.length > 3 && (
                      <p className="px-1 text-[10px] font-medium text-gray-500">+{dayLeads.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

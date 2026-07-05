import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from './Select';
import { cn } from '../../utils/cn';
import { periodIdsForYear } from '../../../modules/accounting/utils/periodSelectionUtils';

interface AccountingPeriod {
  id: number;
  start_date: string;
}

type ViewMode = 'month' | 'quarter' | 'year';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_MONTHS: Record<string, number[]> = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] };

interface PeriodSelectorProps {
  periods: AccountingPeriod[] | undefined;
  value: string;
  onChange: (periodId: string) => void;
  className?: string;
  startYear?: number;
  endYear?: number;
}

export function PeriodSelector({
  periods,
  value: _value,
  onChange,
  className,
  startYear,
  endYear,
}: PeriodSelectorProps) {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const now = new Date();
    return String(now.getFullYear());
  });
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const didAutoSelect = useRef(false);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const from = startYear ?? (periods?.length
      ? Math.min(...periods.map((p) => new Date(p.start_date).getFullYear()))
      : now - 5);
    const to = endYear ?? now + 1;
    return Array.from({ length: to - from + 1 }, (_, i) => to - i);
  }, [periods, startYear, endYear]);

  const periodIdSet = useMemo(() => new Set(parsePeriodIds(_value)), [_value]);

  function parsePeriodIds(raw: string): number[] {
    return raw.split(',').map(Number).filter((id) => id > 0);
  }

  useEffect(() => {
    if (didAutoSelect.current || !periods?.length || _value) return;
    const curMonth = new Date().getMonth();
    const curYear = String(new Date().getFullYear());
    if (!years.includes(Number(curYear))) return;
    const y = parseInt(curYear, 10);
    const match = periods.find((p) => {
      const d = new Date(p.start_date);
      return d.getFullYear() === y && d.getMonth() === curMonth;
    });
    if (match) {
      onChange(String(match.id));
      didAutoSelect.current = true;
    }
  }, [periods, _value, years, onChange]);

  function getPeriodId(month: number, year: string): string {
    if (!periods || !year) return '';
    const y = parseInt(year, 10);
    const match = periods.find((p) => {
      const d = new Date(p.start_date);
      return d.getFullYear() === y && d.getMonth() === month;
    });
    return match ? String(match.id) : '';
  }

  function getQuarterPeriodIds(quarter: string, year: string): string[] {
    if (!periods || !year) return [];
    const months = QUARTER_MONTHS[quarter] || [];
    const y = parseInt(year, 10);
    return periods
      .filter((p) => {
        const d = new Date(p.start_date);
        return d.getFullYear() === y && months.includes(d.getMonth());
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((p) => String(p.id));
  }

  function handleMonthClick(month: number) {
    setViewMode('month');
    setSelectedMonth(month);
    setSelectedQuarter(null);
    const pid = getPeriodId(month, selectedYear || String(years[0] || ''));
    onChange(pid);
  }

  function handleQuarterClick(q: string) {
    setViewMode('quarter');
    setSelectedQuarter(q);
    setSelectedMonth(null);
    const ids = getQuarterPeriodIds(q, selectedYear || String(years[0] || ''));
    onChange(ids.join(','));
  }

  function handleYearSelect(year: string) {
    setViewMode('year');
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedQuarter(null);
    if (!periods?.length) {
      onChange('');
      return;
    }
    const ids = periodIdsForYear(periods, parseInt(year, 10));
    onChange(ids.join(','));
  }

  function handleYearChange(year: string) {
    setSelectedYear(year);
    if (viewMode === 'month' && selectedMonth !== null) {
      const pid = getPeriodId(selectedMonth, year);
      onChange(pid);
    } else if (viewMode === 'quarter' && selectedQuarter !== null) {
      const ids = getQuarterPeriodIds(selectedQuarter, year);
      onChange(ids.length > 0 ? ids.join(',') : '');
    } else if (viewMode === 'year') {
      handleYearSelect(year);
    }
  }

  function handleClear() {
    setSelectedMonth(null);
    setSelectedQuarter(null);
    setSelectedYear('');
    onChange('');
  }

  const activeYear = selectedYear || String(years[0] || '');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => {
              setViewMode('month');
              setSelectedQuarter(null);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('quarter');
              setSelectedMonth(null);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'quarter' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Quarter
          </button>
          <button
            type="button"
            onClick={() => handleYearSelect(activeYear)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Year
          </button>
        </div>
        <Select
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          placeholder={String(years[0] || '')}
          className="w-24"
        />
        {(selectedMonth !== null || selectedQuarter !== null || viewMode === 'year') && (
          <button type="button" onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap">
            Clear
          </button>
        )}
      </div>

      {viewMode === 'month' && (
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => {
            const active = selectedMonth === i;
            const pid = getPeriodId(i, activeYear);
            const hasPeriod = Boolean(pid);
            return (
              <button
                key={m}
                type="button"
                disabled={!hasPeriod}
                onClick={() => handleMonthClick(i)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                  !hasPeriod && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                )}
              >
                {m} {active && activeYear ? activeYear.slice(2, 4) : ''}
              </button>
            );
          })}
        </div>
      )}

      {viewMode === 'quarter' && (
        <div className="flex flex-wrap gap-1">
          {QUARTERS.map((q) => {
            const active = selectedQuarter === q;
            const ids = getQuarterPeriodIds(q, activeYear);
            const hasPeriod = ids.length > 0;
            return (
              <button
                key={q}
                type="button"
                disabled={!hasPeriod}
                onClick={() => handleQuarterClick(q)}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                  !hasPeriod && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                )}
              >
                {q} {activeYear ? activeYear.slice(2, 4) : ''}
              </button>
            );
          })}
        </div>
      )}

      {viewMode === 'year' && (
        <div className="flex flex-wrap gap-1">
          {years.map((y) => {
            const yearIds = periods ? periodIdsForYear(periods, y) : [];
            const active = viewMode === 'year' && activeYear === String(y) && yearIds.every((id) => periodIdSet.has(id));
            return (
              <button
                key={y}
                type="button"
                onClick={() => handleYearSelect(String(y))}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

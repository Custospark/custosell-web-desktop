import { useEffect, useMemo, useState } from 'react';
import { Select } from './Select';
import { cn } from '../../utils/cn';

interface AccountingPeriod {
  id: number;
  start_date: string;
}

type ViewMode = 'month' | 'quarter';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_MONTHS: Record<string, number[]> = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] };

interface PeriodSelectorProps {
  periods: AccountingPeriod[] | undefined;
  value: string;
  onChange: (periodId: string) => void;
  className?: string;
}

export function PeriodSelector({ periods, value, onChange, className }: PeriodSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  const years = useMemo(() => {
    if (!periods?.length) return [];
    const y = new Set<number>();
    periods.forEach((p) => {
      const year = new Date(p.start_date).getFullYear();
      y.add(year);
    });
    return Array.from(y).sort((a, b) => b - a);
  }, [periods]);

  // Auto-select current month/year on initial load
  useEffect(() => {
    if (initialized || !periods?.length) return;
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = String(now.getFullYear());
    if (years.includes(now.getFullYear())) {
      setSelectedMonth(curMonth);
      setSelectedYear(curYear);
      setInitialized(true);
      const pid = getPeriodId(curMonth, curYear);
      if (pid) onChange(pid);
    } else if (years.length > 0) {
      // Current year not in periods — default to most recent
      setSelectedYear(String(years[0]));
      setInitialized(true);
    }
  }, [periods, years]);

  function getPeriodId(month: number, year: string): string {
    if (!periods || !year) return '';
    const y = parseInt(year);
    const match = periods.find((p) => {
      const d = new Date(p.start_date);
      return d.getFullYear() === y && d.getMonth() === month;
    });
    return match ? String(match.id) : '';
  }

  function getQuarterPeriodIds(quarter: string, year: string): string[] {
    if (!periods || !year) return [];
    const months = QUARTER_MONTHS[quarter] || [];
    const y = parseInt(year);
    return periods
      .filter((p) => {
        const d = new Date(p.start_date);
        return d.getFullYear() === y && months.includes(d.getMonth());
      })
      .map((p) => String(p.id));
  }

  function handleMonthClick(month: number) {
    setSelectedMonth(month);
    setSelectedQuarter(null);
    const pid = getPeriodId(month, selectedYear || String(years[0] || ''));
    onChange(pid);
  }

  function handleQuarterClick(q: string) {
    setSelectedQuarter(q);
    setSelectedMonth(null);
    const ids = getQuarterPeriodIds(q, selectedYear || String(years[0] || ''));
    onChange(ids.join(','));
  }

  function handleYearChange(year: string) {
    setSelectedYear(year);
    if (viewMode === 'month' && selectedMonth !== null) {
      const pid = getPeriodId(selectedMonth, year);
      onChange(pid);
    } else if (viewMode === 'quarter' && selectedQuarter !== null) {
      const ids = getQuarterPeriodIds(selectedQuarter, year);
      if (ids.length > 0) onChange(ids.join(','));
      else onChange('');
    }
  }

  function handleClear() {
    setSelectedMonth(null);
    setSelectedQuarter(null);
    setSelectedYear('');
    onChange('');
  }

  const currentYear = selectedYear || String(years[0] || '');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => { setViewMode('month'); setSelectedQuarter(null); }}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            Month
          </button>
          <button
            onClick={() => { setViewMode('quarter'); setSelectedMonth(null); }}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'quarter' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            Quarter
          </button>
        </div>
        <Select
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          placeholder={String(years[0] || '')}
          className="w-24"
        />
        {(selectedMonth !== null || selectedQuarter !== null) && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
        )}
      </div>

      {viewMode === 'month' && (
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => {
            const active = selectedMonth === i;
            const yr = selectedYear || String(years[0] || '');
            return (
              <button
                key={m}
                onClick={() => handleMonthClick(i)}
                className={cn('px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {m} {active && yr ? yr.slice(2,4) : ''}
              </button>
            );
          })}
        </div>
      )}

      {viewMode === 'quarter' && (
        <div className="flex gap-1">
          {QUARTERS.map((q) => {
            const active = selectedQuarter === q;
            const yr = selectedYear || String(years[0] || '');
            return (
              <button
                key={q}
                onClick={() => handleQuarterClick(q)}
                className={cn('px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {q} {yr ? yr.slice(2,4) : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

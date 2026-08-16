import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { CalendarDays, Search, X } from 'lucide-react';
import { currentMonthBounds, dateRangeToReportParams, type ReportPeriodParams } from '../utils/periodSelectionUtils';

interface AccountingDateRangeProps {
  /** Applied report params (date_from/date_to) that drive backend queries. */
  value: ReportPeriodParams | undefined;
  onChange: (params: ReportPeriodParams | undefined) => void;
  /** Optional extra children rendered beside the buttons (e.g. download). */
  rightSlot?: React.ReactNode;
}

/**
 * Simple columnar date-range filter (From / To) defaulting to the current month.
 * Draft inputs apply only when Search is clicked - the applied range maps
 * straight to date_from/date_to on the backend. No period provider required.
 */
export function AccountingDateRange({ value, onChange, rightSlot }: AccountingDateRangeProps) {
  const defaults = currentMonthBounds();
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);

  const apply = () => {
    onChange(dateRangeToReportParams(draftFrom, draftTo));
  };

  const clear = () => {
    setDraftFrom('');
    setDraftTo('');
    onChange(undefined);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">From</span>
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="From date"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">To</span>
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="To date"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={apply}>
            <Search className="w-3.5 h-3.5 mr-1" />Search
          </Button>
          {(draftFrom || draftTo) && (
            <Button size="sm" variant="outline" onClick={clear}>
              <X className="w-3.5 h-3.5 mr-1" />Clear
            </Button>
          )}
        </div>
      </div>
      {rightSlot}
      {value && (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400" aria-hidden />
          {value.date_from ?? 'start'} to {value.date_to ?? 'now'}
        </span>
      )}
    </div>
  );
}

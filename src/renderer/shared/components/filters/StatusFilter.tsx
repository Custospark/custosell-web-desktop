/* eslint-disable react-refresh/only-export-components -- filter chips + shared status constants */
import { cn } from '../../utils/cn';

export interface StatusFilterOption {
  value: string;
  label: string;
}

/** All possible sale payment statuses surfaced as filter chips. */
export const SALE_STATUS_FILTERS: StatusFilterOption[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
  { value: 'refunded', label: 'Refunded' },
];

/** Superscript badge colors per status — counts use the Take Order badge style. */
const STATUS_BADGE_COLORS: Record<string, string> = {
  '': 'bg-blue-500',
  paid: 'bg-emerald-600',
  partially_paid: 'bg-amber-500',
  partially_refunded: 'bg-orange-500',
  refunded: 'bg-red-500',
};

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: StatusFilterOption[];
  /** Whether to render an "All" chip that clears the filter (default true). */
  allowAll?: boolean;
  /** Counts per status value ('' key = All); renders superscript badges. */
  counts?: Record<string, number>;
}

/**
 * Responsive pill filter for list statuses, with superscript counts per status
 * (same standard as the Take Order / Open Orders badges, colored by status).
 * Chips wrap on narrow screens so the filter stays usable on mobile.
 */
export default function StatusFilter({
  value,
  onChange,
  options = SALE_STATUS_FILTERS,
  allowAll = true,
  counts,
}: StatusFilterProps) {
  const chipClass = (active: boolean) =>
    cn(
      'relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:text-gray-900',
    );

  const renderBadge = (status: string) => {
    const count = counts?.[status];
    if (count === undefined || count <= 0) return null;
    return (
      <span
        className={cn(
          'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white',
          STATUS_BADGE_COLORS[status],
        )}
      >
        {formatCount(count)}
      </span>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-1.5" role="group" aria-label="Filter by status">
      {allowAll && (
        <button type="button" onClick={() => onChange('')} className={chipClass(value === '')}>
          All
          {renderBadge('')}
        </button>
      )}
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={chipClass(value === o.value)}>
          {o.label}
          {renderBadge(o.value)}
        </button>
      ))}
    </div>
  );
}

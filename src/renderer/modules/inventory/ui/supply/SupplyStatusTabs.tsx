import { cn } from '../../../../shared/utils/cn';
import { Badge } from '../../../../shared/components/badges/Badge';

export interface SupplyStatusTab<T extends string> {
  id: T;
  label: string;
}

interface SupplyStatusTabsProps<T extends string> {
  tabs: SupplyStatusTab<T>[];
  active: T;
  counts: Record<string, number>;
  onChange: (id: T) => void;
}

/** Horizontally scrollable on narrow screens; wraps from `sm` up. */
export function SupplyStatusTabs<T extends string>({
  tabs,
  active,
  counts,
  onChange,
}: SupplyStatusTabsProps<T>) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
            active === tab.id
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
          )}
        >
          {tab.label}
          <Badge variant="neutral">{counts[tab.id] ?? 0}</Badge>
        </button>
      ))}
    </div>
  );
}

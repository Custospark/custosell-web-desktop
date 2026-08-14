import { type ReactNode } from 'react';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import type { InventoryDeadStockItem, InventoryStatusItem } from '../../api/overview/InventoryOverviewTypes';
import { OverviewCard } from './OverviewCard';

function StatusRow({ name, meta, right, tone }: {
  name: string;
  meta: string;
  right: string;
  tone: 'amber' | 'red' | 'stone';
}) {
  const dot = tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-red-500' : 'bg-gray-400';
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-700">{name}</p>
          <p className="text-xs text-gray-400 truncate">{meta}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{right}</span>
    </div>
  );
}

function StatusListShell({ rows, children }: { rows: number; children: ReactNode }) {
  if (!rows) {
    return (
      <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">All clear</p>
    );
  }
  return <div className="space-y-0">{children}</div>;
}

function lowRows(items: InventoryStatusItem[]) {
  return items.slice(0, 6).map((i) => ({
    name: i.name,
    sku: i.sku,
    meta: `${i.stock_quantity} on hand · threshold ${i.low_stock_threshold}`,
    right: formatCurrency(i.value_cost),
    tone: 'amber' as const,
  }));
}

function outRows(items: InventoryStatusItem[]) {
  return items.slice(0, 6).map((i) => ({
    name: i.name,
    sku: i.sku,
    meta: i.category_name,
    right: '0',
    tone: 'red' as const,
  }));
}

function deadRows(items: InventoryDeadStockItem[]) {
  return items.slice(0, 6).map((i) => ({
    name: i.name,
    sku: i.sku,
    meta: i.dead_days === null ? 'no activity recorded' : `last activity ${i.last_activity ?? '-'} · ${i.dead_days}d`,
    right: formatCurrency(i.value_cost),
    tone: 'stone' as const,
  }));
}

interface OverviewStatusListsProps {
  low: InventoryStatusItem[];
  out: InventoryStatusItem[];
  dead: InventoryDeadStockItem[];
  lowCount: number;
  outCount: number;
  deadCount: number;
}

/** Alert lists - low stock, out of stock, and dead stock. */
export function OverviewStatusLists({ low, out, dead, lowCount, outCount, deadCount }: OverviewStatusListsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <OverviewCard title="Low Stock" subtitle={`${lowCount} product${lowCount === 1 ? '' : 's'} at or below threshold`}>
        <StatusListShell rows={low.length}>
          {lowRows(low).map((r) => <StatusRow key={r.name} {...r} />)}
        </StatusListShell>
      </OverviewCard>
      <OverviewCard title="Out of Stock" subtitle={`${outCount} product${outCount === 1 ? '' : 's'} with no units`}>
        <StatusListShell rows={out.length}>
          {outRows(out).map((r) => <StatusRow key={r.name} {...r} />)}
        </StatusListShell>
      </OverviewCard>
      <OverviewCard title="Dead Stock" subtitle={`${deadCount} product${deadCount === 1 ? '' : 's'} not moving in 90+ days`}>
        <StatusListShell rows={dead.length}>
          {deadRows(dead).map((r) => <StatusRow key={r.name} {...r} />)}
        </StatusListShell>
      </OverviewCard>
    </div>
  );
}
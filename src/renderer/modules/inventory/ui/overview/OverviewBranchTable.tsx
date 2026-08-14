import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import type { InventoryBranchBreakdown } from '../../api/overview/InventoryOverviewTypes';
import { OverviewCard } from './OverviewCard';

interface OverviewBranchTableProps {
  branches: InventoryBranchBreakdown[];
  scopeLabel: string;
}

export function OverviewBranchTable({ branches, scopeLabel }: OverviewBranchTableProps) {
  return (
    <OverviewCard title={`Stock Value by Branch · ${scopeLabel}`} subtitle="Current cost valuation held at each location">
      {branches.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-3 font-medium">Branch</th>
                <th className="pb-2 pr-3 font-medium text-right">Products</th>
                <th className="pb-2 pr-3 font-medium text-right">Units</th>
                <th className="pb-2 pr-3 font-medium text-right">Value (Cost)</th>
                <th className="pb-2 font-medium text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branches.map((b) => (
                <tr key={b.location_id} className="hover:bg-gray-50/60">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-gray-800 truncate max-w-[200px]">{b.location_name}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-right text-gray-600 tabular-nums">{b.product_count}</td>
                  <td className="py-2.5 pr-3 text-right text-gray-600 tabular-nums">{b.stock_quantity}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(b.value_cost)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-gray-600 tabular-nums">{b.share_pct === null ? '-' : `${b.share_pct}%`}</span>
                      <span className="hidden sm:inline-block w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <span className="block h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, b.share_pct ?? 0))}%` }} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
          No branch rows yet
        </p>
      )}
    </OverviewCard>
  );
}
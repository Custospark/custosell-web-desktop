import { useMemo, useState } from 'react';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, ChevronRight, Loader2 } from 'lucide-react';
import { useBranchPerformance } from './DashboardQueries';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { ChartTooltipRow, formatAxisCurrency } from '../../shared/components/charts/chartPrimitives';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { resolveReportDateRange } from '../../shared/utils/reportDatePresets';
import type { BranchPerformance } from './DashboardTypes';

const BRANCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface BranchPerformanceCardProps {
  onOpenReport?: () => void;
}

export default function BranchPerformanceCard({ onOpenReport }: BranchPerformanceCardProps) {
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const { dateFrom, dateTo } = useMemo(() => resolveReportDateRange(datePreset, '', ''), [datePreset]);

  const { data, isLoading } = useBranchPerformance(dateFrom, dateTo);
  const branches = useMemo(() => data?.branches ?? [], [data]);

  const sorted = useMemo(() => [...branches].sort((a, b) => b.net_sales - a.net_sales), [branches]);

  const branchById = useMemo(() => {
    const map = new Map<number, BranchPerformance>();
    for (const b of sorted) map.set(b.location_id, b);
    return map;
  }, [sorted]);

  const chartData = sorted.map((b) => ({ location_id: b.location_id, name: b.name, net_sales: b.net_sales }));
  const totalNet = sorted.reduce((sum, b) => sum + b.net_sales, 0);

  const presets: { id: 'today' | 'week' | 'month' | 'year'; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Branch Performance
        </h3>
        <div className="flex items-center gap-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                datePreset === preset.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading branch performance...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No sales or expenses recorded for this period.</p>
      ) : (
        <>
          <ChartContainer className="h-56" minHeight={224}>
            {() => (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={formatAxisCurrency} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BranchPerformanceTooltip branchById={branchById} />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                  <Bar dataKey="net_sales" radius={[0, 6, 6, 0]} barSize={18}>
                    {sorted.map((entry, index) => (
                      <Cell key={entry.location_id} fill={BRANCH_COLORS[index % BRANCH_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          {branches.length > 1 && (
            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
              {sorted.map((branch, index) => (
                <div key={branch.location_id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
                  />
                  <p className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {branch.name}
                    {branch.is_default && <span className="ml-2 text-xs text-gray-400">Default</span>}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(branch.net_sales)}</p>
                </div>
              ))}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50">
                <p className="flex-1 text-sm font-bold text-gray-900">Total Net Sales</p>
                <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(totalNet)}</p>
              </div>
            </div>
          )}
        </>
      )}

      {onOpenReport && (
        <button
          type="button"
          onClick={onOpenReport}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          View full branch breakdown
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function BranchPerformanceTooltip({
  active, payload, branchById,
}: {
  active?: boolean;
  payload?: Array<{ payload: { location_id: number } }>;
  branchById: Map<number, BranchPerformance>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const branch = branchById.get(payload[0].payload.location_id);
  if (!branch) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[200px]">
      <p className="font-semibold text-gray-900 mb-2 truncate">{branch.name}</p>
      <div className="space-y-1.5">
        <ChartTooltipRow label="Gross sales" value={formatCurrency(branch.gross_sales)} />
        <ChartTooltipRow label="Refunds" value={`-${formatCurrency(branch.refunds)}`} muted />
        <ChartTooltipRow label="Expenses" value={`-${formatCurrency(branch.expenses)}`} muted />
        <ChartTooltipRow label="Net sales" value={formatCurrency(branch.net_sales)} accent />
        <ChartTooltipRow label="Transactions" value={String(branch.transactions)} />
        <ChartTooltipRow label="Items sold" value={String(branch.items_sold)} />
      </div>
    </div>
  );
}

export function BranchPerformanceTable({
  branches, isLoading, dateFrom, dateTo,
}: {
  branches: BranchPerformance[];
  isLoading: boolean;
  dateFrom: string;
  dateTo: string;
}) {
  if (isLoading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400 py-10">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading branch performance...
      </div>
    );
  }

  if (branches.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">No sales or expenses recorded for this period.</p>;
  }

  const sorted = [...branches].sort((a, b) => b.net_sales - a.net_sales);
  const totalNet = sorted.reduce((sum, b) => sum + b.net_sales, 0);

  return (
    <div className="flex flex-col">
      <p className="text-[11px] text-gray-500 mb-3">{dateFrom === dateTo ? dateFrom : `${dateFrom} - ${dateTo}`}</p>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium text-right">Gross</th>
              <th className="py-2 pr-3 font-medium text-right">Expenses</th>
              <th className="py-2 pr-3 font-medium text-right">Net sales</th>
              <th className="py-2 pr-3 font-medium text-right">Transactions</th>
              <th className="py-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.location_id} className="border-b border-gray-100">
                <td className="py-2.5 pr-3 text-gray-800 font-medium truncate max-w-[9rem]">
                  {b.name}
                  {b.is_default && <span className="ml-1.5 text-[10px] text-gray-400">Default</span>}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-600">
                  {formatCurrency(b.gross_sales)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-600">
                  {formatCurrency(b.expenses)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-900 font-semibold">
                  {formatCurrency(b.net_sales)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-600">{b.transactions}</td>
                <td className="py-2.5 text-right tabular-nums text-gray-600">{b.share_pct}%</td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="py-2.5 pr-3 text-gray-900 font-bold">Total</td>
              <td className="py-2.5 pr-3 text-right text-gray-500">-</td>
              <td className="py-2.5 pr-3 text-right text-gray-500">-</td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-gray-900 font-bold">{formatCurrency(totalNet)}</td>
              <td className="py-2.5 pr-3 text-right text-gray-500">-</td>
              <td className="py-2.5 text-right text-gray-500">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart,
} from 'recharts';
import { ChartContainer } from '../../../../shared/components/charts/ChartContainer';
import { CHART_THEME, formatAxisCurrency } from '../../../../shared/components/charts/chartPrimitives';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import type { InventoryTrendPoint } from '../../api/overview/InventoryOverviewTypes';

interface InventoryTrendChartProps {
  data: InventoryTrendPoint[];
  title: string;
  subtitle: string;
}

/** 12-month stock value (at cost) reconstructed from the stock ledger. */
export function InventoryTrendChart({ data, title, subtitle }: InventoryTrendChartProps) {
  const empty = !data.length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>
      {empty ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          No ledger activity in this window yet
        </div>
      ) : (
        <ChartContainer className="h-64" minHeight={256}>
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="inventoryTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_THEME.line} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART_THEME.line} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatAxisCurrency} />
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Stock value']}
                  labelStyle={{ color: '#334155', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="value_cost"
                  stroke={CHART_THEME.line}
                  strokeWidth={2.5}
                  fill="url(#inventoryTrendFill)"
                  dot={{ r: 2.5, fill: '#fff', stroke: CHART_THEME.line, strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: CHART_THEME.line, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      )}
    </div>
  );
}
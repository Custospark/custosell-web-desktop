import {
  Area,
  AreaChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import {
  CHART_THEME,
  ChartTooltipRow,
  ChartTooltipShell,
  chartAverage,
  formatAxisCurrency,
} from '../../shared/components/charts/chartPrimitives';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { ShiftHistoryPoint, ShiftProgressPoint } from './shiftChartSeries';

interface ProgressChartProps {
  data: ShiftProgressPoint[];
  currentTotal: number;
  receiptCount: number;
}

/** Live shift momentum — cumulative net sales after each receipt. */
export function CurrentShiftProgressChart({ data, currentTotal, receiptCount }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Shift Progress</h3>
            <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">Running net total as receipts are recorded</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">No sales yet</span>
        </div>
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          Your progress line appears after the first sale
        </div>
      </div>
    );
  }

  const peak = Math.max(...data.map((point) => point.cumulative), currentTotal);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Shift Progress</h3>
          <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
            {receiptCount} receipt{receiptCount === 1 ? '' : 's'} · running net after refunds
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-700 tabular-nums">{formatCurrency(currentTotal)}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Current net</p>
        </div>
      </div>

      <ChartContainer className="h-72" minHeight={288}>
        {(size) => (
        <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="shiftProgressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_THEME.fillStart} />
                <stop offset="100%" stopColor={CHART_THEME.fillEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatAxisCurrency}
              domain={[0, Math.ceil(peak * 1.08) || 1]}
            />
            <Tooltip
              cursor={{ stroke: CHART_THEME.lineLight, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftProgressPoint;
                return (
                  <ChartTooltipShell title={row.receipt} subtitle={`#${row.index} · ${row.label}`}>
                    <ChartTooltipRow label="This sale" value={formatCurrency(row.saleAmount)} />
                    <ChartTooltipRow label="Running net" value={formatCurrency(row.cumulative)} accent />
                  </ChartTooltipShell>
                );
              }}
            />
            <ReferenceLine y={currentTotal} stroke={CHART_THEME.reference} strokeDasharray="6 4" label={{ value: 'Now', position: 'insideTopRight', fill: CHART_THEME.reference, fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={CHART_THEME.line}
              strokeWidth={2.5}
              fill="url(#shiftProgressFill)"
              dot={{ r: 3, fill: CHART_THEME.line, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART_THEME.line, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

/** Past completed shifts — net sales saved when each shift was closed. */
export function ShiftHistoryTrendChart({ data }: { data: ShiftHistoryPoint[] }) {
  if (data.length === 0) return null;

  const avg = chartAverage(data.map((point) => point.netSales));
  const peak = Math.max(...data.map((point) => point.netSales), avg);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Past Shift Net Sales</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last {data.length} completed shift{data.length === 1 ? '' : 's'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800 tabular-nums">{formatCurrency(avg)}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Average</p>
        </div>
      </div>

      <ChartContainer className="h-56" minHeight={224}>
        {(size) => (
        <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={data.length > 6 ? -24 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 48 : 28}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatAxisCurrency}
              domain={[0, Math.ceil(peak * 1.12) || 1]}
            />
            <Tooltip
              cursor={{ stroke: CHART_THEME.lineLight, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftHistoryPoint;
                return (
                  <ChartTooltipShell title={row.label}>
                    <ChartTooltipRow label="Net sales" value={formatCurrency(row.netSales)} accent />
                  </ChartTooltipShell>
                );
              }}
            />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke={CHART_THEME.reference}
                strokeDasharray="6 4"
                label={{ value: 'Avg', position: 'insideTopRight', fill: CHART_THEME.reference, fontSize: 10 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="netSales"
              stroke={CHART_THEME.line}
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#fff', stroke: CHART_THEME.line, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: CHART_THEME.line, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

// Backward-compatible export
export const ShiftPerformanceChart = ShiftHistoryTrendChart;

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
import { type ReactNode } from 'react';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { ShiftHistoryPoint, ShiftProgressPoint } from './shiftChartSeries';

const CHART = {
  line: '#2563eb',
  lineLight: '#93c5fd',
  fillStart: 'rgba(37, 99, 235, 0.22)',
  fillEnd: 'rgba(37, 99, 235, 0.02)',
  grid: '#eef2f7',
  reference: '#94a3b8',
} as const;

function formatAxisCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(Math.round(value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ChartTooltipShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-900 mb-0.5 truncate">{title}</p>
      {subtitle && <p className="text-gray-500 mb-2">{subtitle}</p>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function TooltipRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${accent ? 'text-blue-700' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

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
            <p className="text-xs text-gray-500 mt-0.5">Running net total as receipts are recorded</p>
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
          <p className="text-xs text-gray-500 mt-0.5">
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
                <stop offset="0%" stopColor={CHART.fillStart} />
                <stop offset="100%" stopColor={CHART.fillEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
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
              cursor={{ stroke: CHART.lineLight, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftProgressPoint;
                return (
                  <ChartTooltipShell title={row.receipt} subtitle={`#${row.index} · ${row.label}`}>
                    <TooltipRow label="This sale" value={formatCurrency(row.saleAmount)} />
                    <TooltipRow label="Running net" value={formatCurrency(row.cumulative)} accent />
                  </ChartTooltipShell>
                );
              }}
            />
            <ReferenceLine y={currentTotal} stroke={CHART.reference} strokeDasharray="6 4" label={{ value: 'Now', position: 'insideTopRight', fill: CHART.reference, fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={CHART.line}
              strokeWidth={2.5}
              fill="url(#shiftProgressFill)"
              dot={{ r: 3, fill: CHART.line, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART.line, stroke: '#fff', strokeWidth: 2 }}
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

  const avg = average(data.map((point) => point.netSales));
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
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
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
              cursor={{ stroke: CHART.lineLight, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftHistoryPoint;
                return (
                  <ChartTooltipShell title={row.label}>
                    <TooltipRow label="Net sales" value={formatCurrency(row.netSales)} accent />
                  </ChartTooltipShell>
                );
              }}
            />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke={CHART.reference}
                strokeDasharray="6 4"
                label={{ value: 'Avg', position: 'insideTopRight', fill: CHART.reference, fontSize: 10 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="netSales"
              stroke={CHART.line}
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#fff', stroke: CHART.line, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: CHART.line, stroke: '#fff', strokeWidth: 2 }}
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

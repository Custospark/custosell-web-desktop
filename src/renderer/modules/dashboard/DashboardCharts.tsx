import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
import { totalDeductions } from '../../shared/utils/accounting';
import type { SalesTrendDay } from './DashboardTypes';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type PieLabelProps = {
  name?: string;
  percent?: number;
};

type TrendChartRow = SalesTrendDay & {
  label: string;
  shortLabel: string;
  net_revenue: number;
  deductions: number;
  gross_revenue: number;
};

export function SalesTrendChart({ data }: { data: SalesTrendDay[] }) {
  const chartData: TrendChartRow[] = data.map((d) => {
    const refunds = d.refunds ?? 0;
    const expenses = d.expenses ?? 0;
    const deductions = totalDeductions(refunds, expenses);
    const date = new Date(d.date);
    return {
      ...d,
      gross_revenue: d.revenue,
      deductions,
      net_revenue: d.net_sales ?? d.net_revenue ?? d.revenue - deductions,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
      shortLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">7-Day Net Sales Trend</h3>
            <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">Daily net sales · whole business</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">No data yet</span>
        </div>
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          Sales trend appears after your first day of activity
        </div>
      </div>
    );
  }

  const netValues = chartData.map((row) => row.net_revenue);
  const avg = chartAverage(netValues);
  const peak = Math.max(...netValues, avg);
  const totalTransactions = chartData.reduce((sum, row) => sum + row.transactions, 0);
  const latestNet = chartData[chartData.length - 1]?.net_revenue ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">7-Day Net Sales Trend</h3>
          <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
            {totalTransactions} transaction{totalTransactions === 1 ? '' : 's'} · daily net after refunds
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-700 tabular-nums">{formatCurrency(latestNet)}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Latest day</p>
        </div>
      </div>

      <ChartContainer className="h-72" minHeight={288}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardSalesTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_THEME.fillStart} />
                  <stop offset="100%" stopColor={CHART_THEME.fillEnd} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
              <XAxis
                dataKey="shortLabel"
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
                  const row = payload[0]?.payload as TrendChartRow;
                  return (
                    <ChartTooltipShell title={row.label} subtitle={`${row.transactions} transaction${row.transactions === 1 ? '' : 's'}`}>
                      <ChartTooltipRow label="Gross sales" value={formatCurrency(row.gross_revenue)} />
                      {row.deductions > 0 && (
                        <ChartTooltipRow label="Refunds + expenses" value={`-${formatCurrency(row.deductions)}`} muted />
                      )}
                      <ChartTooltipRow label="Net sales" value={formatCurrency(row.net_revenue)} accent />
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
              <Area
                type="monotone"
                dataKey="net_revenue"
                stroke={CHART_THEME.line}
                strokeWidth={2.5}
                fill="url(#dashboardSalesTrendFill)"
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

export function ExpensePieChart({ data, title = 'Expense by Category' }: { data: { name: string; value: number }[]; title?: string }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">No expense data</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <ChartContainer className="h-64" minHeight={256}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: PieLabelProps) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => [formatCurrency(Number(value)), 'Amount']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

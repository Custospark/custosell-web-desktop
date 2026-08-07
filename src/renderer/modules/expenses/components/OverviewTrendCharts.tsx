import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { CHART_THEME, formatAxisCurrency } from '../../../shared/components/charts/chartPrimitives';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import type { OverviewData } from '../api/IncomeTypes';

interface TrendChartProps {
  data: OverviewData['daily_spending_trends'];
  title: string;
  subtitle: string;
}

/** Daily spending trend: per-day-of-current-month line. */
export function DailySpendingTrend({ data, title, subtitle }: TrendChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-0.5">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>
      <ChartContainer className="h-64" minHeight={256}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatAxisCurrency} />
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Spent']}
                labelStyle={{ color: '#334155', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={CHART_THEME.line}
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#fff', stroke: CHART_THEME.line, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: CHART_THEME.line, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

interface MonthlyTrendProps {
  data: OverviewData['monthly_spending_trends'];
  title: string;
  subtitle: string;
}

/** Monthly spending trend: per-month-of-current-year bars. */
export function MonthlySpendingTrend({ data, title, subtitle }: MonthlyTrendProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-0.5">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>
      <ChartContainer className="h-64" minHeight={256}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatAxisCurrency} />
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Spent']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="expenses" fill={CHART_THEME.lineLight} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

interface IncomeExpenseLineProps {
  data: OverviewData['monthly_trends'];
}

/** Line graph of income alongside expense — personal accounts only. */
export function IncomeExpenseTrend({ data }: IncomeExpenseLineProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Income vs Expenses</h3>
      <p className="text-xs text-gray-400 mb-4">How much comes in against how much goes out, month by month.</p>
      <ChartContainer className="h-64" minHeight={256}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatAxisCurrency} />
              <Tooltip
                formatter={(val, name) => [formatCurrency(Number(val ?? 0)), name === 'income' ? 'Income' : 'Expenses']}
                contentStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="income" stroke={CHART_THEME.transactions} strokeWidth={2.5} dot={false} name="income" />
              <Line type="monotone" dataKey="expenses" stroke={CHART_THEME.deductions} strokeWidth={2.5} dot={false} name="expenses" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { totalDeductions } from '../../shared/utils/accounting';
import type { SalesTrendDay } from './DashboardTypes';

const TREND_COLORS = {
  netSales: '#3b82f6',
  deductions: '#ef4444',
  transactions: '#10b981',
  gross: '#6b7280',
} as const;

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type PieLabelProps = {
  name?: string;
  percent?: number;
};

type TrendChartRow = SalesTrendDay & {
  label: string;
  net_revenue: number;
  deductions: number;
  gross_revenue: number;
};

export function SalesTrendChart({ data }: { data: SalesTrendDay[] }) {
  const chartData: TrendChartRow[] = data.map((d) => {
    const refunds = d.refunds ?? 0;
    const expenses = d.expenses ?? 0;
    const deductions = totalDeductions(refunds, expenses);
    return {
      ...d,
      gross_revenue: d.revenue,
      deductions,
      net_revenue: d.net_revenue ?? d.revenue - deductions,
      label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">7-Day Net Sales Trend</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Net = gross sales − refunds − expenses · by calendar date · whole business
        </p>
      </div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TREND_COLORS.netSales }} /> Net sales</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ backgroundColor: TREND_COLORS.deductions }} /> Refunds + expenses</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.transactions }} /> Transactions</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as TrendChartRow;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[190px]">
                    <p className="font-semibold text-gray-800 mb-2">{label}</p>
                    <p className="flex justify-between gap-4 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TREND_COLORS.gross }} />
                        Gross sales
                      </span>
                      <span className="font-bold tabular-nums">{formatCurrency(row.gross_revenue)}</span>
                    </p>
                    <p className="flex justify-between gap-4 mb-1" style={{ color: TREND_COLORS.deductions }}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: TREND_COLORS.deductions }} />
                        Refunds + expenses
                      </span>
                      <span className="font-bold tabular-nums">-{formatCurrency(row.deductions)}</span>
                    </p>
                    <p className="flex justify-between gap-4 border-t border-gray-100 pt-1 mt-1 mb-1" style={{ color: TREND_COLORS.netSales }}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: TREND_COLORS.netSales }} />
                        Net sales
                      </span>
                      <span className="font-bold tabular-nums">{formatCurrency(row.net_revenue)}</span>
                    </p>
                    <p className="flex justify-between gap-4" style={{ color: TREND_COLORS.transactions }}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TREND_COLORS.transactions }} />
                        Transactions
                      </span>
                      <span className="font-bold tabular-nums">{row.transactions}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar yAxisId="left" dataKey="net_revenue" name="Net sales" fill={TREND_COLORS.netSales} radius={[4, 4, 0, 0]} barSize={28} />
            <Line yAxisId="left" type="monotone" dataKey="deductions" name="Refunds + expenses" stroke={TREND_COLORS.deductions} strokeWidth={2} dot={{ fill: TREND_COLORS.deductions, r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke={TREND_COLORS.transactions} strokeWidth={2} dot={{ fill: TREND_COLORS.transactions, r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
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
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
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
      </div>
    </div>
  );
}

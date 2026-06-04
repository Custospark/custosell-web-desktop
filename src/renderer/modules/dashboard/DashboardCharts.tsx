import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { SalesTrendDay } from './DashboardTypes';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function SalesTrendChart({ data }: { data: SalesTrendDay[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">7-Day Sales Trend</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v: any) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} hide />
            <Tooltip formatter={(value: any, name: any) => [name === 'revenue' ? formatCurrency(Number(value)) : value, name === 'revenue' ? 'Revenue' : 'Transactions']} />
            <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
            <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ExpensePieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Expense by Category</h3>
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">No expense data</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Expense by Category</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

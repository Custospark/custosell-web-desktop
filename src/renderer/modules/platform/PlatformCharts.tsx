import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { PlatformMetricDay, PlatformOverview } from './api/PlatformTypes';

const TREND_COLORS = {
  signups: '#3b82f6',
  transactions: '#10b981',
  activeBusinesses: '#8b5cf6',
} as const;

const PIE_COLORS = ['#10b981', '#f59e0b', '#9ca3af', '#ef4444'];

const ACTIVITY_LABELS: Record<string, string> = {
  active: 'Active (30d)',
  dormant: 'Dormant',
  never_used: 'Never used',
  suspended: 'Suspended',
};

export function PlatformActivityTrendChart({ data }: { data: PlatformMetricDay[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">7-Day Platform Activity</h3>
        <p className="text-xs text-gray-500 mt-0.5">Signups, active businesses, and transactions</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="signups" name="Signups" fill={TREND_COLORS.signups} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="active_businesses" name="Active businesses" fill={TREND_COLORS.activeBusinesses} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke={TREND_COLORS.transactions} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PlatformActivityPieChart({ overview }: { overview: PlatformOverview }) {
  const pieData = [
    { name: ACTIVITY_LABELS.active, value: overview.businesses.active },
    { name: ACTIVITY_LABELS.dormant, value: overview.businesses.dormant },
    { name: ACTIVITY_LABELS.never_used, value: overview.businesses.never_used },
    { name: ACTIVITY_LABELS.suspended, value: overview.businesses.suspended },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Business Activity Breakdown</h3>
      {pieData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No business data yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function RevenueByCurrencyPanel({ items }: { items: PlatformOverview['revenue_by_currency'] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Currency (30d)</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No revenue recorded yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <div key={row.currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{row.currency}</p>
                <p className="text-xs text-gray-500">{row.business_count} business(es)</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.revenue_30d, row.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

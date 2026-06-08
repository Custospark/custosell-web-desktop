import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ComposedChart, Line, Legend } from 'recharts';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { GrossIncomeDistribution, PlatformBusinessGrowthDay, PlatformMetricDay, PlatformOverview } from './api/PlatformTypes';

const TREND_COLORS = {
  signups: '#3b82f6',
  transactions: '#10b981',
  activeBusinesses: '#8b5cf6',
  grossSales: '#f59e0b',
} as const;

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#9ca3af', '#7c3aed'];

const ACTIVITY_LABELS: Record<string, string> = {
  active: 'Active (≤30d)',
  dormant: 'Dormant (31–90d)',
  churned: 'Churned (90d+)',
  never_used: 'Never used',
  suspended: 'Suspended',
};

const TIER_COLORS = ['#94a3b8', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];

export function PlatformBusinessOnboardingChart({ data, rangeLabel }: { data: PlatformBusinessGrowthDay[]; rangeLabel?: string }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Business Onboarding Growth</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Daily signups and cumulative businesses on platform{rangeLabel ? ` · ${rangeLabel}` : ''}
        </p>
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No onboarding data for this range</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="signups" name="New businesses" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Total on platform" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function PlatformActivityTrendChart({ data }: { data: PlatformMetricDay[] }) {
  const chartData = data.map((d) => ({
    ...d,
    gross_sales_num: parseFloat(d.gross_sales) || 0,
    label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">7-Day Platform Activity</h3>
        <p className="text-xs text-gray-500 mt-0.5">Signups, selling businesses, transactions, and platform gross sales</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="signups" name="Signups" fill={TREND_COLORS.signups} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="active_businesses" name="Businesses selling" fill={TREND_COLORS.activeBusinesses} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke={TREND_COLORS.transactions} strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="gross_sales_num" name="Gross sales" stroke={TREND_COLORS.grossSales} strokeWidth={2} strokeDasharray="4 4" dot={false} />
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
    { name: ACTIVITY_LABELS.churned, value: overview.businesses.churned ?? 0 },
    { name: ACTIVITY_LABELS.never_used, value: overview.businesses.never_used },
    { name: ACTIVITY_LABELS.suspended, value: overview.businesses.suspended },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Business Activity Breakdown</h3>
      <p className="text-xs text-gray-500 mb-4">Who is actively selling vs idle — guides outreach and onboarding</p>
      {pieData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No business data yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pieData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Businesses" radius={[0, 4, 4, 0]}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function GrossIncomeDistributionPanel({ distributions }: { distributions: GrossIncomeDistribution[] }) {
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const current = distributions[currencyIndex];

  if (!distributions.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Gross Income Distribution (30d)</h3>
        <p className="text-sm text-gray-400 text-center py-8">No gross sales data yet</p>
      </div>
    );
  }

  const chartData = (current?.tiers ?? []).map((t) => ({
    ...t,
    shortLabel: `T${t.tier}`,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Gross Income Distribution (30d)</h3>
        <p className="text-xs text-gray-500 mt-0.5">5 tiers from lowest to highest gross sales — use for subscription band pricing</p>
      </div>

      {distributions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {distributions.map((d, i) => (
            <button
              key={d.currency}
              type="button"
              onClick={() => setCurrencyIndex(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                i === currencyIndex ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d.currency}
            </button>
          ))}
        </div>
      )}

      <div className="h-56 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number, name: string) => [value, name === 'business_count' ? 'Businesses' : name]}
              labelFormatter={(_, payload) => {
                const tier = payload?.[0]?.payload as GrossIncomeDistribution['tiers'][0] | undefined;
                if (!tier) return '';
                return `${tier.label} · ${formatCurrency(tier.min_gross, current.currency)} – ${formatCurrency(tier.max_gross, current.currency)}`;
              }}
            />
            <Bar dataKey="business_count" name="business_count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 mb-4">
        {current.tiers.map((tier) => (
          <div key={tier.tier} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium">{tier.label}</span>
            <span className="text-gray-500">
              {tier.business_count} biz · {formatCurrency(tier.total_gross_sales_30d, current.currency)} gross
            </span>
          </div>
        ))}
      </div>

      {current.decision_note && (
        <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">
          {current.decision_note}
        </p>
      )}
    </div>
  );
}

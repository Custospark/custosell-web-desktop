import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { CHART_THEME, ChartTooltipShell, ChartTooltipRow, formatAxisCurrency } from '../../../shared/components/charts/chartPrimitives';
import { useEstimateAnalytics } from '../api/useEstimateQueries';
import { useBusiness } from '../../settings/api/settings/BusinessQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  BarChart3, DollarSign, Percent, Target, TrendingUp, Trophy, XCircle, FileSpreadsheet,
} from 'lucide-react';

const n = (v: unknown): number => Number(v) || 0;

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
  rose: { border: 'border-rose-500', shadow: 'hover:shadow-rose-500/20', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', glow: 'bg-rose-500/10', hoverBg: 'group-hover:bg-rose-200' },
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  expired: '#f59e0b',
  converted: '#8b5cf6',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted',
};

function StatCard({ label, value, sub, icon: Icon, color, badge, progress }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof cardStyles; badge: string; progress?: number;
}) {
  const s = cardStyles[color];
  return (
    <div className={`group relative flex min-h-[120px] w-full cursor-default flex-col justify-center rounded-xl border-2 bg-gradient-to-br from-white to-white p-5 transition-all duration-300 hover:-translate-y-0.5 ${s.border} ${s.shadow}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 overflow-hidden rounded-full blur-2xl ${s.glow}`} />
      <div className="relative mb-3 flex items-start justify-between gap-2">
        <div className={`shrink-0 rounded-xl p-3 transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
          <Icon className={`h-5 w-5 ${s.iconColor}`} />
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{badge}</span>
      </div>
      <p className="relative mb-0.5 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">{value}</p>
      <p className="relative whitespace-normal break-words text-sm font-medium leading-snug text-gray-500">{label}</p>
      {sub && <p className="relative mt-0.5 text-xs leading-snug text-gray-400">{sub}</p>}
      {progress !== undefined && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function EstimatesInsightsPage() {
  const { data: business } = useBusiness();
  const { data: analytics, isLoading, isError, refetch } = useEstimateAnalytics();

  const currency = business?.currency ?? 'UGX';

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  if (isError || !analytics) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="Could not load insights"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  const monthlyData = (analytics.by_month ?? []).map((r) => ({
    month: r.month,
    Approved: r.approved,
    Rejected: r.rejected,
    value: r.value,
  }));

  const statusData = (analytics.by_status ?? []).map((r) => ({
    name: statusLabels[r.status] ?? r.status,
    value: r.count,
    total: r.total,
  }));

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Estimate performance</h2>
        <p className="mt-1 text-sm text-gray-500">Win rate, margins, and pipeline value from your proposals.</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Win rate"
          value={`${n(analytics.win_rate).toFixed(1)}%`}
          sub="Approved vs decided"
          icon={Trophy}
          color="green"
          badge="Win rate"
          progress={n(analytics.win_rate)}
        />
        <StatCard
          label="Avg margin"
          value={`${n(analytics.avg_margin_percent).toFixed(1)}%`}
          sub="Across all estimates"
          icon={Percent}
          color="purple"
          badge="Margin"
        />
        <StatCard
          label="Pipeline value"
          value={formatCurrency(n(analytics.total_pipeline_value), currency)}
          sub="Open draft & sent"
          icon={DollarSign}
          color="blue"
          badge="Open"
        />
        <StatCard
          label="Approved value"
          value={formatCurrency(n(analytics.total_approved_value), currency)}
          icon={Target}
          color="amber"
          badge="Won"
        />
        <StatCard
          label="Gross profit"
          value={formatCurrency(n(analytics.total_gross_profit), currency)}
          sub="Price minus cost"
          icon={TrendingUp}
          color="indigo"
          badge="CVP"
        />
        <StatCard
          label="Rejected"
          value={String(analytics.rejected_count)}
          icon={XCircle}
          color="rose"
          badge="Lost"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Monthly trend
          </h3>
          {monthlyData.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <BarChart3 className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Not enough data yet.</p>
            </div>
          ) : (
            <ChartContainer className="h-72">
              {({ width, height }) => (
                <ResponsiveContainer width={width} height={height}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload;
                        return (
                          <ChartTooltipShell title={label != null ? String(label) : ''}>
                            <ChartTooltipRow label="Approved" value={String(row?.Approved ?? 0)} accent />
                            <ChartTooltipRow label="Rejected" value={String(row?.Rejected ?? 0)} muted />
                            <ChartTooltipRow label="Value" value={formatCurrency(row?.value ?? 0, currency)} />
                          </ChartTooltipShell>
                        );
                      }}
                    />
                    <Bar dataKey="value" fill={CHART_THEME.line} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Target className="h-4 w-4 text-blue-600" />
            By status
          </h3>
          {statusData.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Target className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No estimates yet.</p>
            </div>
          ) : (
            <ChartContainer className="h-72">
              {({ width, height }) => (
                <ResponsiveContainer width={width} height={height}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload;
                        return (
                          <ChartTooltipShell title={row?.name ?? ''}>
                            <ChartTooltipRow label="Count" value={String(row?.value ?? 0)} accent />
                            <ChartTooltipRow label="Total" value={formatCurrency(row?.total ?? 0, currency)} />
                          </ChartTooltipShell>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          )}
        </Card>
      </div>

      <Card className="flex items-center gap-3 p-4 text-sm text-gray-600">
        <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0" />
        <span>
          <strong className="text-gray-900">{analytics.total_estimates}</strong> estimates total —
          {' '}{analytics.draft_count} drafts, {analytics.sent_count} sent,
          {' '}{analytics.approved_count} approved, {analytics.rejected_count} rejected,
          {' '}{analytics.converted_count} converted.
        </span>
      </Card>
    </div>
  );
}
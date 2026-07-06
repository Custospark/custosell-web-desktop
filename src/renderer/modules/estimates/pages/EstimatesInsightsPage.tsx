import { Card } from '../../../shared/components/cards/Card';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useEstimateAnalytics } from '../api/useEstimateQueries';
import { useBusiness } from '../../settings/api/settings/BusinessQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import PipelineInsightStatCard from '../../pipeline/ui/PipelineInsightStatCard';
import {
  BarChart3, DollarSign, Percent, Target, TrendingUp, Trophy, XCircle, FileSpreadsheet,
} from 'lucide-react';

export default function EstimatesInsightsPage() {
  const { data: business } = useBusiness();
  const { data: analytics, isLoading, isError, refetch } = useEstimateAnalytics();

  const currency = business?.currency ?? 'UGX';

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
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

  const maxStatusCount = Math.max(...(analytics.by_status ?? []).map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Estimate performance</h2>
        <p className="mt-1 text-sm text-gray-500">Win rate, margins, and pipeline value from your proposals.</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PipelineInsightStatCard
          label="Win rate"
          value={`${analytics.win_rate.toFixed(1)}%`}
          sub="Approved vs decided"
          icon={Trophy}
          color="green"
          badge="Win rate"
          progress={analytics.win_rate}
        />
        <PipelineInsightStatCard
          label="Avg margin"
          value={`${analytics.avg_margin_percent.toFixed(1)}%`}
          sub="Across all estimates"
          icon={Percent}
          color="purple"
          badge="Margin"
        />
        <PipelineInsightStatCard
          label="Pipeline value"
          value={formatCurrency(analytics.total_pipeline_value, currency)}
          sub="Open draft & sent"
          icon={DollarSign}
          color="blue"
          badge="Open"
        />
        <PipelineInsightStatCard
          label="Approved value"
          value={formatCurrency(analytics.total_approved_value, currency)}
          icon={Target}
          color="amber"
          badge="Won"
        />
        <PipelineInsightStatCard
          label="Gross profit"
          value={formatCurrency(analytics.total_gross_profit, currency)}
          sub="Price minus cost"
          icon={TrendingUp}
          color="indigo"
          badge="CVP"
        />
        <PipelineInsightStatCard
          label="Rejected"
          value={String(analytics.rejected_count)}
          icon={XCircle}
          color="rose"
          badge="Lost"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">By status</h3>
          <ul className="space-y-3">
            {(analytics.by_status ?? []).map((row) => (
              <li key={row.status}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-gray-700">{row.status}</span>
                  <span className="font-medium tabular-nums">{row.count} · {formatCurrency(row.total, currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(row.count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">Monthly trend</h3>
          {(analytics.by_month ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">Not enough data yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {analytics.by_month.map((row) => (
                <li key={row.month} className="flex items-center justify-between border-b border-gray-50 py-2">
                  <span className="text-gray-600">{row.month}</span>
                  <span className="flex gap-3 tabular-nums">
                    <span className="text-emerald-700">{row.approved} won</span>
                    <span className="text-red-600">{row.rejected} lost</span>
                    <span className="font-medium">{formatCurrency(row.value, currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex items-center gap-3 p-4 text-sm text-gray-600">
        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
        <span>
          <strong>{analytics.total_estimates}</strong> estimates total —
          {' '}{analytics.sent_count} sent, {analytics.approved_count} approved, {analytics.draft_count} drafts.
        </span>
      </Card>
    </div>
  );
}

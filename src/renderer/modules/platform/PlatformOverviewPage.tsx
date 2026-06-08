import { usePlatformMetrics, usePlatformOverview } from './api/PlatformQueries';
import { GrossIncomeDistributionPanel, PlatformActivityPieChart, PlatformActivityTrendChart } from './PlatformCharts';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { Badge } from '../../shared/components/badges/Badge';
import { Building2, Users, Activity, Ban, TrendingUp, DollarSign } from 'lucide-react';
import type { ActivityStatus } from './api/PlatformTypes';

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  red: { border: 'border-red-500', shadow: 'hover:shadow-red-500/20', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700', glow: 'bg-red-500/10', hoverBg: 'group-hover:bg-red-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
};

const activityBadge: Record<ActivityStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  dormant: 'warning',
  never_used: 'neutral',
  suspended: 'danger',
};

export default function PlatformOverviewPage() {
  const { data: overview, isLoading } = usePlatformOverview();
  const { data: metrics } = usePlatformMetrics(7);

  if (isLoading || !overview) return <LoadingSkeleton variant="table" />;

  const cards = [
    { label: 'Total Businesses', value: String(overview.businesses.total), icon: Building2, color: 'blue' as const, badge: 'All' },
    { label: 'Selling (30d)', value: String(overview.businesses.with_gross_sales_30d), icon: DollarSign, color: 'green' as const, badge: 'Gross sales' },
    { label: 'Active (30d)', value: String(overview.businesses.active), icon: Activity, color: 'green' as const, badge: 'Active' },
    { label: 'Idle / Never Used', value: String(overview.businesses.dormant + overview.businesses.never_used), icon: TrendingUp, color: 'amber' as const, badge: 'Idle' },
    { label: 'Total Users', value: String(overview.users.total), icon: Users, color: 'indigo' as const, badge: 'Users' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Gross sales insights for subscription pricing · {overview.pricing_insights.activity_window_days}-day window</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          return (
            <div key={card.label}
              className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-white ${s.border} ${s.shadow} hover:-translate-y-0.5 group min-h-[130px] flex flex-col justify-center`}>
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
              <div className="flex items-center justify-between mb-4 relative">
                <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                  <Icon className={`w-6 h-6 ${s.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>{card.badge}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{card.value}</p>
              <p className="text-sm font-medium text-gray-500 relative">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <PlatformActivityTrendChart data={metrics ?? []} />

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
              Top Earners (30d gross sales)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Businesses generating the most gross sales — anchor premium tiers here</p>
            {overview.top_businesses_30d.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No gross sales yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {overview.top_businesses_30d.slice(0, 10).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shrink-0">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate block">{b.name}</span>
                      <Badge variant={activityBadge[b.activity_status]} className="mt-1">{b.activity_status.replace('_', ' ')}</Badge>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">{formatCurrency(b.gross_sales_30d, b.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PlatformActivityPieChart overview={overview} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <GrossIncomeDistributionPanel distributions={overview.pricing_insights.gross_income_distribution} />

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Pricing snapshot</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Businesses with gross sales (30d): <span className="font-semibold text-gray-900">{overview.pricing_insights.businesses_with_gross_sales_30d}</span></p>
              <p>Businesses with zero sales (30d): <span className="font-semibold text-gray-900">{overview.pricing_insights.businesses_without_gross_sales_30d}</span></p>
              <p>Suspended: <span className="font-semibold text-red-600">{overview.businesses.suspended}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">System Health</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>API: <span className="font-medium text-green-600">{overview.system.api_status}</span></p>
              <p>Database latency: <span className="font-medium">{overview.system.database_latency_ms}ms</span></p>
              <p>Queue pending: <span className="font-medium">{overview.system.queue_pending}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

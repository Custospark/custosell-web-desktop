import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { usePlatformBusinesses, usePlatformBusinessStats, useUpdateBusinessStatus } from './api/PlatformQueries';
import type { ActivityStatus, PlatformBusiness } from './api/PlatformTypes';
import { PlatformBusinessOnboardingChart } from './PlatformCharts';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { PlatformBusinessStatusModal } from './components/PlatformBusinessStatusModal';
import {
  Building2, Ban, CheckCircle, TrendingUp, Calendar, Users, DollarSign, Receipt, AlertTriangle,
} from 'lucide-react';

const activityBadge: Record<ActivityStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  dormant: 'warning',
  never_used: 'neutral',
  suspended: 'danger',
};

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  red: { border: 'border-red-500', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
};

function defaultRange() {
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  return { from, to };
}

export default function PlatformBusinessesPage() {
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultRange().from);
  const [dateTo, setDateTo] = useState(defaultRange().to);

  const [statusModal, setStatusModal] = useState<{
    business: PlatformBusiness;
    nextStatus: 'active' | 'suspended';
  } | null>(null);

  const statsParams = useMemo(() => ({ date_from: dateFrom, date_to: dateTo }), [dateFrom, dateTo]);
  const listParams = useMemo(() => ({
    sort: 'gross_sales_30d',
    direction: 'desc',
    per_page: '500',
  }), []);

  const { data: stats, isLoading: statsLoading } = usePlatformBusinessStats(statsParams);
  const { data, isLoading: listLoading } = usePlatformBusinesses(listParams);
  const updateStatus = useUpdateBusinessStatus();

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      if (activityFilter && b.activity_status !== activityFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q)
        || (b.email?.toLowerCase().includes(q) ?? false)
        || (b.owner_email?.toLowerCase().includes(q) ?? false)
        || (b.owner_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data?.data, search, activityFilter]);

  const openStatusModal = (business: PlatformBusiness) => {
    setStatusModal({
      business,
      nextStatus: business.status === 'active' ? 'suspended' : 'active',
    });
  };

  const handleStatusConfirm = (reason: string) => {
    if (!statusModal) return;
    updateStatus.mutate(
      {
        id: statusModal.business.id,
        status: statusModal.nextStatus,
        reason,
      },
      { onSuccess: () => setStatusModal(null) },
    );
  };

  if (statsLoading && listLoading) return <LoadingSkeleton variant="table" />;

  const statCards = stats ? [
    { label: 'Joined Today', value: String(stats.onboarding.today), hint: 'Prioritize welcome onboarding', icon: Calendar, color: 'blue' as const },
    { label: 'Joined This Week', value: String(stats.onboarding.this_week), hint: 'Weekly acquisition pace', icon: TrendingUp, color: 'green' as const },
    { label: 'Joined This Month', value: String(stats.onboarding.this_month), hint: 'Monthly growth signal', icon: Building2, color: 'indigo' as const },
    { label: 'In Selected Range', value: String(stats.onboarding.in_range), hint: `${stats.onboarding.range_from} → ${stats.onboarding.range_to}`, icon: Calendar, color: 'amber' as const },
    { label: 'Selling (30d)', value: String(stats.totals.with_gross_sales_30d), hint: 'Businesses with sale transactions', icon: DollarSign, color: 'green' as const },
    { label: 'Sales Tx (30d)', value: stats.totals.transactions_30d.toLocaleString(), hint: 'Platform-wide sale count from sales table', icon: Receipt, color: 'blue' as const },
    { label: 'Suspended', value: String(stats.totals.suspended), hint: 'Blocked from sign-in', icon: Ban, color: 'red' as const },
    { label: 'Total Businesses', value: String(stats.totals.total), hint: `${stats.totals.active_status} active accounts`, icon: Users, color: 'indigo' as const },
  ] : [];

  const rangeLabel = `${stats?.onboarding.range_from ?? dateFrom} to ${stats?.onboarding.range_to ?? dateTo}`;

  return (
    <div className="space-y-6">
      <PlatformBusinessStatusModal
        open={statusModal !== null}
        business={statusModal?.business ?? null}
        nextStatus={statusModal?.nextStatus ?? null}
        isPending={updateStatus.isPending}
        onClose={() => setStatusModal(null)}
        onConfirm={handleStatusConfirm}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Onboarding growth, gross sales in local currency, and account control — Tx (30d) counts sale records from the sales table
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Chart range from</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 sm:ml-auto pb-2">
          Adjust the range to see onboarding stats and cumulative growth for that period
        </p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const s = cardStyles[card.color];
              return (
                <div
                  key={card.label}
                  className={`rounded-xl p-5 border-2 bg-white ${s.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${s.iconBg}`}>
                      <Icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>Decision</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PlatformBusinessOnboardingChart data={stats.growth} rangeLabel={rangeLabel} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Decision Insights
              </h3>
              <ul className="space-y-3">
                {stats.decisions.map((note) => (
                  <li key={note} className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                <p>Platform gross (30d): <span className="font-semibold">{formatCurrency(stats.totals.gross_sales_30d, 'UGX')}</span></p>
                <p className="text-gray-400">Mixed currencies in table below — gross per business uses local currency</p>
              </div>
            </div>
          </div>
        </>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by business name, owner email, or business email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
            <p className="text-xs text-gray-400 mt-1">Instant client-side search · {rows.length} of {data?.data?.length ?? 0} shown</p>
          </div>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
          >
            <option value="">All activity</option>
            <option value="active">Active (30d)</option>
            <option value="dormant">Dormant</option>
            <option value="never_used">Never used</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {listLoading ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <Table<PlatformBusiness>
            rowKey={(b) => b.id}
            columns={[
              { key: 'name', header: 'Business', render: (b) => (
                <div>
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.owner_email ?? b.email ?? '—'}</p>
                </div>
              )},
              { key: 'account', header: 'Account', render: (b) => (
                <Badge variant={b.status === 'active' ? 'success' : 'danger'}>{b.status}</Badge>
              )},
              { key: 'activity', header: 'Activity', render: (b) => (
                <Badge variant={activityBadge[b.activity_status]}>{b.activity_status.replace('_', ' ')}</Badge>
              )},
              { key: 'currency', header: 'Currency' },
              { key: 'gross_today', header: 'Gross today', render: (b) => formatCurrency(b.gross_sales_today, b.currency) },
              { key: 'gross_7d', header: 'Gross 7d', render: (b) => formatCurrency(b.gross_sales_7d, b.currency) },
              { key: 'gross_30d', header: 'Gross 30d', render: (b) => (
                <span className="font-semibold">{formatCurrency(b.gross_sales_30d, b.currency)}</span>
              )},
              { key: 'gross_all', header: 'Gross all time', render: (b) => formatCurrency(b.gross_sales_all_time, b.currency) },
              { key: 'transactions_30d', header: 'Sales (30d)', render: (b) => (
                <span title="Count of sale records in the last 30 days">{b.transactions_30d.toLocaleString()}</span>
              )},
              { key: 'plan', header: 'Plan', render: (b) => b.plan_name ?? '—' },
              { key: 'actions', header: '', render: (b) => (
                <Button
                  variant={b.status === 'active' ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => openStatusModal(b)}
                  disabled={updateStatus.isPending}
                >
                  {b.status === 'active' ? (
                    <><Ban className="w-3.5 h-3.5 mr-1" />Suspend</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5 mr-1" />Reactivate</>
                  )}
                </Button>
              )},
            ]}
            data={rows}
          />
        )}
      </Card>
    </div>
  );
}

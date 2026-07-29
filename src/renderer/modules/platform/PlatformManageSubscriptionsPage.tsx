import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SUBSCRIPTIONS } from '../../shared/api/endpoints/endpoints';
import { platformKeys, platformFreshQuery } from './api/PlatformQueries';
import type { PlatformSubscription } from './api/PlatformTypes';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Card } from '../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Receipt, Check, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-600',
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PlatformManageSubscriptionsPage() {
  const { data: subscriptions = [], isLoading, error } = useQuery({
    queryKey: platformKeys.subscriptions(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformSubscription[] }>(SUBSCRIPTIONS.BASE);
      return data.data ?? [];
    },
    ...platformFreshQuery,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let list = subscriptions;

    if (statusFilter) {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        String(s.business_id).includes(q)
        || String(s.plan_id).includes(q)
        || s.business?.name?.toLowerCase().includes(q)
        || s.plan?.name?.toLowerCase().includes(q)
        || s.status.toLowerCase().includes(q)
        || s.billing_cycle?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [subscriptions, search, statusFilter]);

  const paginated = usePagination(filtered, 10);

  const tableData = useMemo(() =>
    paginated.data.map((s, i) => ({ ...s, __row: (paginated.page - 1) * paginated.pageSize + i + 1 })),
    [paginated.data, paginated.page, paginated.pageSize],
  );

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState
        icon={<Receipt className="w-12 h-12" />}
        title="Failed to load subscriptions"
        description={error.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">View all business subscriptions</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by business or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Table<PlatformSubscription & { __row: number }>
          rowKey={(s) => s.id}
          columns={[
            { key: '__row', header: '#', align: 'center', render: (s) => (
              <span className="text-sm text-gray-400 font-mono">{s.__row}</span>
            )},
            { key: 'business_id', header: 'Business', render: (s) => (
              <span className="font-medium text-gray-900">{s.business?.name ?? `Business #${s.business_id}`}</span>
            )},
            { key: 'plan_id', header: 'Plan', render: (s) => (
              <span className="text-gray-600">{s.plan?.name ?? `Plan #${s.plan_id}`}</span>
            )},
            { key: 'price_monthly_usd', header: 'Monthly (USD)', align: 'right', render: (s) => (
              <>
                <span className="text-sm font-medium text-gray-900">${Number(s.price_monthly_usd ?? s.plan?.price_monthly_usd ?? 0).toFixed(2)}</span>
              </>
            )},
            { key: 'price_yearly_usd', header: 'Yearly (USD)', align: 'right', render: (s) => (
              <>
                <span className="text-sm font-medium text-gray-900">{s.price_yearly_usd ?? s.plan?.price_yearly_usd ? `$${Number(s.price_yearly_usd ?? s.plan?.price_yearly_usd ?? 0).toFixed(2)}` : '—'}</span>
              </>
            )},
            { key: 'status', header: 'Status', align: 'center', render: (s) => (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {s.status}
              </span>
            )},
            { key: 'billing_cycle', header: 'Cycle', align: 'center', render: (s) => (
              <span className="text-sm text-gray-600 capitalize">{s.billing_cycle ?? '—'}</span>
            )},
            { key: 'onboarding', header: 'Onboarding (USD)', align: 'right', render: (s) => {
              const fee = s.onboarding_fee_usd;
              return (
                <div className="flex items-center justify-end gap-1.5">
                  {fee != null && fee > 0 && (
                    <span className="text-sm font-medium text-gray-900">${Number(fee).toFixed(2)}</span>
                  )}
                  {s.onboarding_fee_paid
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><Check className="w-3 h-3" /> Paid</span>
                    : fee != null && fee > 0
                      ? <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium"><X className="w-3 h-3" /> Unpaid</span>
                      : <span className="text-xs text-gray-400">—</span>}
                </div>
              );
            }},
            { key: 'next_billing_date', header: 'Next Billing', render: (s) => (
              <span className="text-sm text-gray-600">{formatDate(s.next_billing_date)}</span>
            )},
          ]}
          data={tableData}
        />

        <Pagination
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          totalItems={paginated.totalItems}
          pageSize={paginated.pageSize}
          onPageChange={paginated.setPage}
          onPageSizeChange={paginated.setPageSize}
        />
      </Card>
    </div>
  );
}

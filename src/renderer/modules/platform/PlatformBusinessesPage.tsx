import { useMemo, useState } from 'react';
import { usePlatformBusinesses, useUpdateBusinessStatus } from './api/PlatformQueries';
import type { ActivityStatus, PlatformBusiness } from './api/PlatformTypes';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { Building2, Ban, CheckCircle } from 'lucide-react';

const activityBadge: Record<ActivityStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  dormant: 'warning',
  never_used: 'neutral',
  suspended: 'danger',
};

export default function PlatformBusinessesPage() {
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const params = useMemo(() => {
    const p: Record<string, string> = { sort: 'revenue_30d', direction: 'desc', per_page: '50' };
    if (search.trim()) p.search = search.trim();
    if (activityFilter) p.activity_status = activityFilter;
    return p;
  }, [search, activityFilter]);

  const { data, isLoading } = usePlatformBusinesses(params);
  const updateStatus = useUpdateBusinessStatus();
  const { confirm } = useConfirm();

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    if (!activityFilter) return list;
    return list.filter((b) => b.activity_status === activityFilter);
  }, [data?.data, activityFilter]);

  const handleStatus = async (business: PlatformBusiness) => {
    const suspending = business.status === 'active';
    const reason = suspending
      ? window.prompt('Reason for suspension (optional):') ?? undefined
      : undefined;

    const ok = await confirm({
      title: suspending ? 'Suspend Business' : 'Reactivate Business',
      message: suspending
        ? `Suspend "${business.name}"? Users will be blocked from tenant APIs.`
        : `Reactivate "${business.name}"?`,
      confirmText: suspending ? 'Suspend' : 'Reactivate',
      variant: suspending ? 'danger' : 'warning',
    });

    if (!ok) return;

    updateStatus.mutate({
      id: business.id,
      status: suspending ? 'suspended' : 'active',
      reason,
    });
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Businesses</h1>
        <p className="text-sm text-gray-500 mt-1">All tenants on Custosell · revenue in each business currency</p>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <SearchInput placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            <option value="">All activity</option>
            <option value="active">Active (30d)</option>
            <option value="dormant">Dormant</option>
            <option value="never_used">Never used</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <Table<PlatformBusiness>
          rowKey={(b) => b.id}
          columns={[
            { key: 'name', header: 'Business', render: (b) => (
              <div>
                <p className="font-medium text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-500">{b.owner_email ?? '—'}</p>
              </div>
            )},
            { key: 'activity', header: 'Activity', render: (b) => <Badge variant={activityBadge[b.activity_status]}>{b.activity_status.replace('_', ' ')}</Badge> },
            { key: 'currency', header: 'Currency' },
            { key: 'revenue_today', header: 'Today', render: (b) => formatCurrency(b.revenue_today, b.currency) },
            { key: 'revenue_7d', header: '7d', render: (b) => formatCurrency(b.revenue_7d, b.currency) },
            { key: 'revenue_30d', header: '30d', render: (b) => <span className="font-semibold">{formatCurrency(b.revenue_30d, b.currency)}</span> },
            { key: 'revenue_all_time', header: 'All time', render: (b) => formatCurrency(b.revenue_all_time, b.currency) },
            { key: 'transactions_30d', header: 'Tx (30d)' },
            { key: 'plan', header: 'Plan', render: (b) => b.plan_name ?? '—' },
            { key: 'actions', header: '', render: (b) => (
              <Button
                variant={b.status === 'active' ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => void handleStatus(b)}
                disabled={updateStatus.isPending}
              >
                {b.status === 'active' ? <><Ban className="w-3.5 h-3.5 mr-1" />Suspend</> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Reactivate</>}
              </Button>
            )},
          ]}
          data={rows}
        />
      </Card>
    </>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { differenceInDays, format, parseISO, subDays } from 'date-fns';
import {
  useBulkDeleteBusinesses,
  useBulkUpdateBusinessStatus,
  useDeleteBusiness,
  useNotifyBusinesses,
  usePlatformBusinesses,
  usePlatformBusinessStats,
  useResetBusinessData,
  useUpdateBusinessStatus,
  useActivateBusinessSubscription,
} from './api/PlatformQueries';
import {
  formatBusinessActivityRecency,
  resolveDisplayActivityStatus,
  matchesStatusDurationFilter,
  validateBusinessStatsDateRange,
} from './api/platformBusinessValidation';
import type { BusinessAccountStatus, PlatformBusiness } from './api/PlatformTypes';
import { PlatformBusinessOnboardingChart } from './PlatformCharts';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { Pagination } from '../../shared/components/tables/Pagination';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { PlatformBusinessStatusModal } from './components/PlatformBusinessStatusModal';
import { PlatformBusinessNotificationModal } from './components/PlatformBusinessNotificationModal';
import { PlatformBusinessDeleteModal } from './components/PlatformBusinessDeleteModal';
import { PlatformBusinessResetModal } from './components/PlatformBusinessResetModal';
import { PlatformAccountStatusBadge } from './components/PlatformAccountStatusBadge';
import { PlatformActivityStatusBadge } from './components/PlatformActivityStatusBadge';
import { PlatformBulkActionBar } from './components/PlatformBulkActionBar';
import { PlatformBusinessFilters } from './components/PlatformBusinessFilters';
import { PlatformBusinessRowActions } from './components/PlatformBusinessRowActions';
import { PlatformActivateSubscriptionModal } from './components/PlatformActivateSubscriptionModal';
import { AlertTriangle, CheckSquare, Mail, RefreshCw, Shield, Square, Trash2 } from 'lucide-react';

import { PlatformBusinessStatCards } from './components/PlatformBusinessStatCards';

function defaultRange() {
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  return { from, to };
}

function daysInStatus(business: PlatformBusiness): number | null {
  if (!business.status_changed_at) return null;
  return differenceInDays(new Date(), parseISO(business.status_changed_at));
}

type ModalTarget = PlatformBusiness[];

export default function PlatformBusinessesPage() {
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<BusinessAccountStatus | ''>('');
  const [statusDurationFilter, setStatusDurationFilter] = useState<number | ''>('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultRange().from);
  const [dateTo, setDateTo] = useState(defaultRange().to);
  const [dateTouched, setDateTouched] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusTargets, setStatusTargets] = useState<ModalTarget | null>(null);
  const [notifyTargets, setNotifyTargets] = useState<ModalTarget | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ModalTarget | null>(null);
  const [resetTargets, setResetTargets] = useState<ModalTarget | null>(null);
  const [activateTarget, setActivateTarget] = useState<PlatformBusiness | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const dateValidation = useMemo(
    () => validateBusinessStatsDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const statsParams = useMemo((): Record<string, string> => {
    if (!dateValidation.valid) return {};
    return { date_from: dateFrom, date_to: dateTo };
  }, [dateFrom, dateTo, dateValidation.valid]);

  const listParams = useMemo(() => {
    const params: Record<string, string> = {
      sort: 'gross_sales_30d',
      direction: 'desc',
      page: String(page),
      per_page: String(pageSize),
    };
    if (search.trim()) params.search = search.trim();
    if (accountStatusFilter) params.status = accountStatusFilter;
    if (subscriptionFilter) params.subscription_status = subscriptionFilter;
    return params;
  }, [search, accountStatusFilter, subscriptionFilter, page, pageSize]);

  const { data: stats, isLoading: statsLoading } = usePlatformBusinessStats(statsParams, dateValidation.valid);
  const { data, isLoading: listLoading } = usePlatformBusinesses(listParams);
  const updateStatus = useUpdateBusinessStatus();
  const bulkUpdateStatus = useBulkUpdateBusinessStatus();
  const deleteBusiness = useDeleteBusiness();
  const bulkDelete = useBulkDeleteBusinesses();
  const notifyBusinesses = useNotifyBusinesses();
  const resetBusinessData = useResetBusinessData();
  const activateSubscription = useActivateBusinessSubscription();

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      if (activityFilter && b.activity_status !== activityFilter) return false;
      if (!matchesStatusDurationFilter(b, accountStatusFilter, statusDurationFilter)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q)
        || (b.email?.toLowerCase().includes(q) ?? false)
        || (b.owner_email?.toLowerCase().includes(q) ?? false)
        || (b.owner_name?.toLowerCase().includes(q) ?? false)
        || (b.owner_phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data?.data, search, activityFilter, accountStatusFilter, statusDurationFilter]);

  const paginated = {
    data: rows,
    page: data?.current_page ?? page,
    totalPages: Math.max(1, data?.last_page ?? 1),
    totalItems: data?.total ?? rows.length,
    pageSize: data?.per_page ?? pageSize,
    setPage: (p: number) => { setPage(p); setSelectedIds(new Set()); },
    setPageSize: (s: number) => { setPageSize(s); setPage(1); setSelectedIds(new Set()); },
  };

  const tableData = useMemo(
    () => paginated.data.map((b, i) => ({ ...b, __row: (paginated.page - 1) * paginated.pageSize + i + 1 })),
    [paginated.data, paginated.page, paginated.pageSize],
  );

  const selectedBusinesses = useMemo(
    () => rows.filter((b) => selectedIds.has(b.id)),
    [rows, selectedIds],
  );

  const filteredIds = rows.map((b) => b.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredIds));
  }, [allSelected, filteredIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleAccountStatusChange = (v: BusinessAccountStatus | '') => { setAccountStatusFilter(v); setPage(1); };
  const handleSubscriptionFilterChange = (v: string) => { setSubscriptionFilter(v); setPage(1); };

  const handleStatusConfirm = (
    status: BusinessAccountStatus,
    reason: string,
    channel: Parameters<typeof updateStatus.mutate>[0]['channel'],
  ) => {
    if (!statusTargets?.length) return;
    if (statusTargets.length === 1) {
      updateStatus.mutate(
        { id: statusTargets[0].id, status, reason, channel },
        { onSuccess: () => { setStatusTargets(null); clearSelection(); } },
      );
    } else {
      bulkUpdateStatus.mutate(
        { ids: statusTargets.map((b) => b.id), status, reason, channel },
        { onSuccess: () => { setStatusTargets(null); clearSelection(); } },
      );
    }
  };

  const handleNotifyConfirm = (
    intention: Parameters<typeof notifyBusinesses.mutate>[0]['intention'],
    message: string,
    subject: string,
    markAsNotified: boolean,
    channel: Parameters<typeof notifyBusinesses.mutate>[0]['channel'],
  ) => {
    if (!notifyTargets?.length) return;
    notifyBusinesses.mutate(
      {
        businessIds: notifyTargets.map((b) => b.id),
        intention,
        message,
        subject: subject || undefined,
        markAsNotified,
        channel,
      },
      { onSuccess: () => { setNotifyTargets(null); clearSelection(); } },
    );
  };

  const handleDeleteConfirm = (reason: string) => {
    if (!deleteTargets?.length) return;
    if (deleteTargets.length === 1) {
      deleteBusiness.mutate(
        { id: deleteTargets[0].id, reason },
        { onSuccess: () => { setDeleteTargets(null); clearSelection(); } },
      );
    } else {
      bulkDelete.mutate(
        { ids: deleteTargets.map((b) => b.id), reason },
        { onSuccess: () => { setDeleteTargets(null); clearSelection(); } },
      );
    }
  };

  const handleResetConfirm = () => {
    if (!resetTargets?.length) return;
    resetBusinessData.mutate(resetTargets[0].id, {
      onSuccess: () => { setResetTargets(null); clearSelection(); },
    });
  };

  const handleActivateConfirm = (planId: number, billingCycle: 'monthly' | 'yearly') => {
    if (!activateTarget) return;
    activateSubscription.mutate(
      { id: activateTarget.id, planId, billingCycle },
      { onSuccess: () => setActivateTarget(null) },
    );
  };

  const actionPending = updateStatus.isPending || bulkUpdateStatus.isPending
    || deleteBusiness.isPending || bulkDelete.isPending || notifyBusinesses.isPending || resetBusinessData.isPending
    || activateSubscription.isPending;

  if (statsLoading && listLoading) return <LoadingSkeleton variant="table" />;

  const rangeLabel = `${stats?.onboarding.range_from ?? dateFrom} to ${stats?.onboarding.range_to ?? dateTo}`;

  return (
    <div className="space-y-6">
      <PlatformBusinessStatusModal
        key={statusTargets ? `status-${statusTargets.map((b) => b.id).join(',')}` : 'status-closed'}
        open={statusTargets !== null}
        businesses={statusTargets ?? []}
        isPending={updateStatus.isPending || bulkUpdateStatus.isPending}
        onClose={() => setStatusTargets(null)}
        onConfirm={handleStatusConfirm}
      />
      <PlatformBusinessNotificationModal
        key={notifyTargets ? `notify-${notifyTargets.map((b) => b.id).join(',')}` : 'notify-closed'}
        open={notifyTargets !== null}
        businesses={notifyTargets ?? []}
        isPending={notifyBusinesses.isPending}
        onClose={() => setNotifyTargets(null)}
        onConfirm={handleNotifyConfirm}
      />
      <PlatformBusinessDeleteModal
        key={deleteTargets ? `delete-${deleteTargets.map((b) => b.id).join(',')}` : 'delete-closed'}
        open={deleteTargets !== null}
        businesses={deleteTargets ?? []}
        isPending={deleteBusiness.isPending || bulkDelete.isPending}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleDeleteConfirm}
      />
      <PlatformBusinessResetModal
        key={resetTargets ? `reset-${resetTargets.map((b) => b.id).join(',')}` : 'reset-closed'}
        open={resetTargets !== null}
        businesses={resetTargets ?? []}
        isPending={resetBusinessData.isPending}
        onClose={() => setResetTargets(null)}
        onConfirm={handleResetConfirm}
      />
      <PlatformActivateSubscriptionModal
        key={activateTarget ? `activate-${activateTarget.id}` : 'activate-closed'}
        open={activateTarget !== null}
        business={activateTarget}
        isPending={activateSubscription.isPending}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateConfirm}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Onboarding growth, gross sales, staff counts, account control, and targeted notifications
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Chart range from</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            onBlur={() => setDateTouched((t) => ({ ...t, from: true }))}
            className={`border rounded-lg px-3 py-2 text-sm ${
              dateTouched.from && dateValidation.errors.dateFrom ? 'border-red-500' : 'border-gray-200'
            }`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            onBlur={() => setDateTouched((t) => ({ ...t, to: true }))}
            className={`border rounded-lg px-3 py-2 text-sm ${
              dateTouched.to && dateValidation.errors.dateTo ? 'border-red-500' : 'border-gray-200'
            }`}
          />
        </div>
      </div>

      {stats && (
        <>
          <PlatformBusinessStatCards stats={stats} />

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
            </div>
          </div>
        </>
      )}

      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <PlatformBusinessFilters
            search={search}
            onSearchChange={handleSearchChange}
            resultCount={rows.length}
            totalCount={data?.total ?? 0}
            activityFilter={activityFilter}
            onActivityFilterChange={setActivityFilter}
            accountStatusFilter={accountStatusFilter}
            onAccountStatusFilterChange={handleAccountStatusChange}
            statusDurationFilter={statusDurationFilter}
            onStatusDurationFilterChange={setStatusDurationFilter}
            subscriptionFilter={subscriptionFilter}
            onSubscriptionFilterChange={handleSubscriptionFilterChange}
            allSelected={allSelected}
            onToggleAll={toggleAll}
          />
        </div>

        <PlatformBulkActionBar
          count={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
        >
          <Button variant="secondary" size="sm" onClick={() => setNotifyTargets(selectedBusinesses)} disabled={actionPending}>
            <Mail className="w-3.5 h-3.5 mr-1" aria-hidden />
            Notify
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setStatusTargets(selectedBusinesses)} disabled={actionPending}>
            <Shield className="w-3.5 h-3.5 mr-1" aria-hidden />
            Change status
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTargets(selectedBusinesses)} disabled={actionPending}>
            <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden />
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setResetTargets(selectedBusinesses)} disabled={actionPending}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" aria-hidden />
            Wipe Data
          </Button>
        </PlatformBulkActionBar>

        {listLoading ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <>
            <Table<PlatformBusiness & { __row: number }>
              rowKey={(b) => b.id}
              columns={[
                { key: '__row', header: '#', align: 'center', render: (b) => (
                  <span className="text-sm text-gray-400 font-mono">{b.__row}</span>
                )},
                {
                  key: 'select',
                  header: '',
                  render: (b) => (
                    <button type="button" onClick={() => toggleOne(b.id)} className="p-1 text-gray-400 hover:text-gray-700">
                      {selectedIds.has(b.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  ),
                },
                { key: 'name', header: 'Business', render: (b) => (
                  <div>
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.owner_email ?? b.email ?? '—'}</p>
                    {b.owner_phone && (
                      <a href={`tel:${b.owner_phone}`} className="text-xs text-blue-600 hover:underline block">
                        {b.owner_phone}
                      </a>
                    )}
                  </div>
                )},
                { key: 'account', header: 'Account', render: (b) => {
                  const days = daysInStatus(b);
                  return (
                    <div>
                      <PlatformAccountStatusBadge status={b.status} />
                      {days !== null && (
                        <p className="text-xs text-gray-400 mt-0.5">{days}d in status</p>
                      )}
                    </div>
                  );
                }},
                { key: 'activity', header: 'Activity', render: (b) => {
                  const activityStatus = resolveDisplayActivityStatus(b);
                  return (
                    <div>
                      <PlatformActivityStatusBadge status={activityStatus} />
                      <p
                        className="text-xs text-gray-400 mt-0.5"
                        title={`Sale/login window: ${b.activity_active_days ?? 30}d active · ${b.activity_dormant_days ?? 90}d dormant`}
                      >
                        {formatBusinessActivityRecency(b)}
                      </p>
                    </div>
                  );
                }},
                { key: 'staff', header: 'Staff', render: (b) => (
                  <span className="font-medium" title="Owner + users linked to this business">{b.staff_count.toLocaleString()}</span>
                )},
                { key: 'currency', header: 'Currency' },
                { key: 'total_stock', header: 'Products', render: (b) => (
                  <span title="Total number of active products">{b.total_stock.toLocaleString()}</span>
                )},
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
                { key: 'actions', header: 'Actions', align: 'center', render: (b) => (
                  <PlatformBusinessRowActions
                    business={b}
                    disabled={actionPending}
                    onNotify={() => setNotifyTargets([b])}
                    onChangeStatus={() => setStatusTargets([b])}
                    onActivateSubscription={() => setActivateTarget(b)}
                    onReset={() => setResetTargets([b])}
                    onDelete={() => setDeleteTargets([b])}
                  />
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
          </>
        )}
      </Card>
    </div>
  );
}

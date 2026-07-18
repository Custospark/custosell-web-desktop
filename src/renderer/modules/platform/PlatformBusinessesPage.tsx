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
} from './api/PlatformQueries';
import {
  BUSINESS_ACCOUNT_STATUSES,
  STATUS_DURATION_DAYS,
  STATUS_LABELS,
  formatBusinessActivityRecency,
  resolveDisplayActivityStatus,
  matchesStatusDurationFilter,
  validateBusinessStatsDateRange,
} from './api/platformBusinessValidation';
import type { BusinessAccountStatus, PlatformBusiness } from './api/PlatformTypes';
import { PlatformBusinessOnboardingChart } from './PlatformCharts';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
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
import {
  AlertTriangle, Mail, Shield, Trash2, RefreshCw, CheckSquare, Square,
} from 'lucide-react';

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
  const [dateFrom, setDateFrom] = useState(defaultRange().from);
  const [dateTo, setDateTo] = useState(defaultRange().to);
  const [dateTouched, setDateTouched] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusTargets, setStatusTargets] = useState<ModalTarget | null>(null);
  const [notifyTargets, setNotifyTargets] = useState<ModalTarget | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ModalTarget | null>(null);
  const [resetTargets, setResetTargets] = useState<ModalTarget | null>(null);

  const dateValidation = useMemo(
    () => validateBusinessStatsDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const statsParams = useMemo((): Record<string, string> => {
    if (!dateValidation.valid) return {};
    return { date_from: dateFrom, date_to: dateTo };
  }, [dateFrom, dateTo, dateValidation.valid]);

  const listParams = useMemo(() => ({
    sort: 'gross_sales_30d',
    direction: 'desc',
    per_page: '500',
  }), []);

  const { data: stats, isLoading: statsLoading } = usePlatformBusinessStats(statsParams, dateValidation.valid);
  const { data, isLoading: listLoading } = usePlatformBusinesses(listParams);
  const updateStatus = useUpdateBusinessStatus();
  const bulkUpdateStatus = useBulkUpdateBusinessStatus();
  const deleteBusiness = useDeleteBusiness();
  const bulkDelete = useBulkDeleteBusinesses();
  const notifyBusinesses = useNotifyBusinesses();
  const resetBusinessData = useResetBusinessData();

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      if (activityFilter && b.activity_status !== activityFilter) return false;
      if (accountStatusFilter && b.status !== accountStatusFilter) return false;
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

  const paginated = usePagination(rows, 15);

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

  const actionPending = updateStatus.isPending || bulkUpdateStatus.isPending
    || deleteBusiness.isPending || bulkDelete.isPending || notifyBusinesses.isPending || resetBusinessData.isPending;

  if (statsLoading && listLoading) return <LoadingSkeleton variant="table" />;

  const rangeLabel = `${stats?.onboarding.range_from ?? dateFrom} to ${stats?.onboarding.range_to ?? dateTo}`;

  return (
    <div className="space-y-6">
      <PlatformBusinessStatusModal
        open={statusTargets !== null}
        businesses={statusTargets ?? []}
        isPending={updateStatus.isPending || bulkUpdateStatus.isPending}
        onClose={() => setStatusTargets(null)}
        onConfirm={handleStatusConfirm}
      />
      <PlatformBusinessNotificationModal
        open={notifyTargets !== null}
        businesses={notifyTargets ?? []}
        isPending={notifyBusinesses.isPending}
        onClose={() => setNotifyTargets(null)}
        onConfirm={handleNotifyConfirm}
      />
      <PlatformBusinessDeleteModal
        open={deleteTargets !== null}
        businesses={deleteTargets ?? []}
        isPending={deleteBusiness.isPending || bulkDelete.isPending}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleDeleteConfirm}
      />
      <PlatformBusinessResetModal
        key={resetTargets ? resetTargets.map((b) => b.id).join(',') : 'closed'}
        open={resetTargets !== null}
        businesses={resetTargets ?? []}
        isPending={resetBusinessData.isPending}
        onClose={() => setResetTargets(null)}
        onConfirm={handleResetConfirm}
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
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                placeholder="Search by business name, owner email, or business email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {rows.length} match{rows.length === 1 ? '' : 'es'} · {data?.data?.length ?? 0} total loaded
              </p>
            </div>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
            >
            <option value="">All activity</option>
            <option value="active">Active — sale or login ≤30d</option>
            <option value="dormant">Dormant — 31–90d since last activity</option>
            <option value="churned">Churned — 90d+ since last activity</option>
            <option value="never_used">Never used — no sales or logins</option>
            <option value="suspended">Suspended account</option>
            </select>
            <select
              value={accountStatusFilter}
              onChange={(e) => {
                setAccountStatusFilter(e.target.value as BusinessAccountStatus | '');
                if (!e.target.value) setStatusDurationFilter('');
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
            >
              <option value="">All account statuses</option>
              {BUSINESS_ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={statusDurationFilter}
              onChange={(e) => setStatusDurationFilter(e.target.value ? Number(e.target.value) : '')}
              disabled={!accountStatusFilter}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit disabled:opacity-50"
              title="Filter businesses in the selected account status for at least N days"
            >
              <option value="">Any duration</option>
              {STATUS_DURATION_DAYS.map((d) => (
                <option key={d} value={d}>In status ≥ {d} days</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect all' : `Select all (${rows.length})`}
            </button>
          </div>
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
            <Table<PlatformBusiness>
              rowKey={(b) => b.id}
              columns={[
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
                { key: 'actions', header: '', render: (b) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setNotifyTargets([b])} disabled={actionPending} title="Send notification">
                      <Mail className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStatusTargets([b])} disabled={actionPending} title="Change status">
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTargets([b])} disabled={actionPending} title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResetTargets([b])} disabled={actionPending} title="Wipe transactional data">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                  </div>
                )},
              ]}
              data={paginated.data}
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

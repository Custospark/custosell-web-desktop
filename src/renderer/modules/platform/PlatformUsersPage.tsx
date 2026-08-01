import { useCallback, useMemo, useState } from 'react';
import { differenceInDays, format, parseISO, subDays } from 'date-fns';
import {
  useBulkUpdatePlatformUserStatus,
  useBulkDeletePlatformUsers,
  useBulkAssignPlatformRoles,
  useDeletePlatformUser,
  useNotifyPlatformUsers,
  usePlatformUsers,
  usePlatformUserStats,
  useUpdatePlatformUserStatus,
} from './api/PlatformUserQueries';
import {
  STATUS_DURATION_DAYS,
  USER_ACCOUNT_STATUSES,
  USER_STATUS_LABELS,
  computePlatformUserStatsFromList,
  formatUserLoginRecency,
  matchesStatusDurationFilter,
  resolveUserLoginActivity,
  resolveUserStatus,
  validateUserStatsDateRange,
} from './api/platformUserValidation';
import type { PlatformUser, UserAccountStatus, UserLoginActivity } from './api/PlatformTypes';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { PlatformUserStatusModal } from './components/PlatformUserStatusModal';
import { PlatformUserNotificationModal } from './components/PlatformUserNotificationModal';
import { PlatformUserDeleteModal } from './components/PlatformUserDeleteModal';
import { PlatformUserRoleModal } from './components/PlatformUserRoleModal';
import { PlatformAccountStatusBadge } from './components/PlatformAccountStatusBadge';
import { PlatformActivityStatusBadge } from './components/PlatformActivityStatusBadge';
import { PlatformBulkActionBar } from './components/PlatformBulkActionBar';
import { PlatformUserStatCards } from './components/PlatformUserStatCards';
import {
  Mail, Shield, Trash2, CheckSquare, Square, UserCog,
} from 'lucide-react';
function defaultRange() {
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  return { from, to };
}
function daysInStatus(user: PlatformUser): number | null {
  if (!user.status_changed_at) return null;
  const changed = parseISO(user.status_changed_at);
  if (Number.isNaN(changed.getTime())) return null;
  return differenceInDays(new Date(), changed);
}
function displayRole(user: PlatformUser): string {
  if (user.is_platform_admin) return 'Platform admin';
  if (user.role_name) return user.role_name;
  const platformRoles = user.platform_roles ?? [];
  if (platformRoles.length > 0) return platformRoles.join(', ');
  return '—';
}
type ModalTarget = PlatformUser[];

export default function PlatformUsersPage() {
  const [search, setSearch] = useState('');
  const [loginActivityFilter, setLoginActivityFilter] = useState<UserLoginActivity | ''>('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<UserAccountStatus | ''>('');
  const [statusDurationFilter, setStatusDurationFilter] = useState<number | ''>('');
  const [businessFilter, setBusinessFilter] = useState<'all' | 'with_business' | 'no_business' | 'platform_admin'>('all');
  const [dateFrom, setDateFrom] = useState(defaultRange().from);
  const [dateTo, setDateTo] = useState(defaultRange().to);
  const [dateTouched, setDateTouched] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusTargets, setStatusTargets] = useState<ModalTarget | null>(null);
  const [notifyTargets, setNotifyTargets] = useState<ModalTarget | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ModalTarget | null>(null);
  const [roleTargets, setRoleTargets] = useState<ModalTarget | null>(null);

  const dateValidation = useMemo(
    () => validateUserStatsDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );
  const statsParams = useMemo((): Record<string, string> => {
    if (!dateValidation.valid) return {};
    return { date_from: dateFrom, date_to: dateTo };
  }, [dateFrom, dateTo, dateValidation.valid]);

  const listParams = useMemo(() => ({
    sort: 'last_login_at',
    direction: 'desc',
    per_page: '500',
  }), []);

  const { data: apiStats } = usePlatformUserStats(statsParams, dateValidation.valid);
  const { data, isLoading: listLoading } = usePlatformUsers(listParams);
  const updateStatus = useUpdatePlatformUserStatus();
  const bulkUpdateStatus = useBulkUpdatePlatformUserStatus();
  const notifyUsers = useNotifyPlatformUsers();
  const deleteUser = useDeletePlatformUser();
  const bulkDeleteUsers = useBulkDeletePlatformUsers();
  const bulkAssignRoles = useBulkAssignPlatformRoles();
  const fallbackStats = useMemo(() => {
    if (!dateValidation.valid || !data?.data) return null;
    return computePlatformUserStatsFromList(data.data, dateFrom, dateTo);
  }, [data, dateFrom, dateTo, dateValidation.valid]);

  const stats = apiStats ?? fallbackStats;
  const statsFromClient = !apiStats && Boolean(fallbackStats);

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      const status = resolveUserStatus(u);
      const loginActivity = resolveUserLoginActivity(u);

      if (loginActivityFilter && loginActivity !== loginActivityFilter) return false;
      if (accountStatusFilter && status !== accountStatusFilter) return false;
      if (!matchesStatusDurationFilter(u, accountStatusFilter, statusDurationFilter)) return false;

      if (businessFilter === 'with_business' && !u.business_id) return false;
      if (businessFilter === 'no_business' && u.business_id) return false;
      if (businessFilter === 'platform_admin' && !u.is_platform_admin) return false;

      if (!q) return true;
      const name = u.name?.toLowerCase() ?? '';
      const email = u.email?.toLowerCase() ?? '';
      return (
        name.includes(q)
        || email.includes(q)
        || (u.phone?.toLowerCase().includes(q) ?? false)
        || (u.business_name?.toLowerCase().includes(q) ?? false)
        || displayRole(u).toLowerCase().includes(q)
      );
    });
  }, [data?.data, search, loginActivityFilter, accountStatusFilter, statusDurationFilter, businessFilter]);

  const paginated = usePagination(rows, 15);

  const selectedUsers = useMemo(
    () => rows.filter((u) => selectedIds.has(u.id)),
    [rows, selectedIds],
  );

  const filteredIds = rows.map((u) => u.id);
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
    status: UserAccountStatus,
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
        { ids: statusTargets.map((u) => u.id), status, reason, channel },
        { onSuccess: () => { setStatusTargets(null); clearSelection(); } },
      );
    }
  };

  const handleNotifyConfirm = (
    intention: Parameters<typeof notifyUsers.mutate>[0]['intention'],
    message: string,
    subject: string,
    markAsNotified: boolean,
    channel: Parameters<typeof notifyUsers.mutate>[0]['channel'],
  ) => {
    if (!notifyTargets?.length) return;
    notifyUsers.mutate(
      {
        userIds: notifyTargets.map((u) => u.id),
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
      deleteUser.mutate(
        { id: deleteTargets[0].id, reason },
        { onSuccess: () => { setDeleteTargets(null); clearSelection(); } },
      );
    } else {
      bulkDeleteUsers.mutate(
        { ids: deleteTargets.map((u) => u.id), reason },
        { onSuccess: () => { setDeleteTargets(null); clearSelection(); } },
      );
    }
  };

  const handleRoleConfirm = (payload: {
    emails?: string[];
    ids?: number[];
    role: string;
    action: 'assign' | 'revoke';
  }) => {
    bulkAssignRoles.mutate(payload, {
      onSuccess: () => { setRoleTargets(null); clearSelection(); },
    });
  };

  const actionPending = updateStatus.isPending || bulkUpdateStatus.isPending || notifyUsers.isPending
    || deleteUser.isPending || bulkDeleteUsers.isPending || bulkAssignRoles.isPending;
  if (listLoading) return <LoadingSkeleton variant="table" />;

  const rangeLabel = `${stats?.onboarding.range_from ?? dateFrom} to ${stats?.onboarding.range_to ?? dateTo}`;

  return (
    <div className="space-y-6">
      <PlatformUserStatusModal
        open={statusTargets !== null}
        users={statusTargets ?? []}
        isPending={updateStatus.isPending || bulkUpdateStatus.isPending}
        onClose={() => setStatusTargets(null)}
        onConfirm={handleStatusConfirm}
      />
      <PlatformUserNotificationModal
        open={notifyTargets !== null}
        users={notifyTargets ?? []}
        isPending={notifyUsers.isPending}
        onClose={() => setNotifyTargets(null)}
        onConfirm={handleNotifyConfirm}
      />
      <PlatformUserDeleteModal
        open={deleteTargets !== null}
        users={deleteTargets ?? []}
        isPending={deleteUser.isPending || bulkDeleteUsers.isPending}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleDeleteConfirm}
      />
      <PlatformUserRoleModal
        key={roleTargets !== null ? 'open' : 'closed'}
        open={roleTargets !== null}
        users={roleTargets ?? []}
        isPending={bulkAssignRoles.isPending}
        onClose={() => setRoleTargets(null)}
        onConfirm={handleRoleConfirm}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cross-tenant user growth, login activity, account control, and targeted notifications
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
        <PlatformUserStatCards stats={stats} statsFromClient={statsFromClient} rangeLabel={rangeLabel} />
      )}

      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                placeholder="Search by name, email, phone, business, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {rows.length} match{rows.length === 1 ? '' : 'es'} · {data?.data?.length ?? 0} total loaded
              </p>
            </div>
            <select
              value={loginActivityFilter}
              onChange={(e) => setLoginActivityFilter(e.target.value as UserLoginActivity | '')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
            >
              <option value="">All login activity</option>
              <option value="active">Active — logged in ≤30d</option>
              <option value="dormant">Dormant — 31–90d since login</option>
              <option value="churned">Churned — 90d+ since login</option>
              <option value="never_logged_in">Never logged in</option>
            </select>
            <select
              value={accountStatusFilter}
              onChange={(e) => {
                setAccountStatusFilter(e.target.value as UserAccountStatus | '');
                if (!e.target.value) setStatusDurationFilter('');
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
            >
              <option value="">All account statuses</option>
              {USER_ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>{USER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={statusDurationFilter}
              onChange={(e) => setStatusDurationFilter(e.target.value ? Number(e.target.value) : '')}
              disabled={!accountStatusFilter}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit disabled:opacity-50"
              title="Filter users in the selected account status for at least N days"
            >
              <option value="">Any duration</option>
              {STATUS_DURATION_DAYS.map((d) => (
                <option key={d} value={d}>In status ≥ {d} days</option>
              ))}
            </select>
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value as typeof businessFilter)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
            >
              <option value="all">All user types</option>
              <option value="with_business">With business</option>
              <option value="no_business">No business linked</option>
              <option value="platform_admin">Platform operators</option>
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
            <Button variant="secondary" size="sm" onClick={() => setRoleTargets([])} disabled={actionPending}>
              <UserCog className="w-3.5 h-3.5 mr-1" />Assign by email
            </Button>
          </div>
        </div>

        <PlatformBulkActionBar
          count={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
        >
          <Button variant="secondary" size="sm" onClick={() => setNotifyTargets(selectedUsers)} disabled={actionPending}>
            <Mail className="w-3.5 h-3.5 mr-1" aria-hidden />
            Notify
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setStatusTargets(selectedUsers)} disabled={actionPending}>
            <Shield className="w-3.5 h-3.5 mr-1" aria-hidden />
            Change status
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRoleTargets(selectedUsers)} disabled={actionPending}>
            <UserCog className="w-3.5 h-3.5 mr-1" aria-hidden />
            Assign roles
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTargets(selectedUsers)} disabled={actionPending}>
            <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden />
            Delete
          </Button>
        </PlatformBulkActionBar>

        {listLoading ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <>
            <Table<PlatformUser>
              rowKey={(u) => u.id}
              columns={[
                {
                  key: 'select',
                  header: '',
                  render: (u) => (
                    <button type="button" onClick={() => toggleOne(u.id)} className="p-1 text-gray-400 hover:text-gray-700">
                      {selectedIds.has(u.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  ),
                },
                { key: 'name', header: 'User', render: (u) => (
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {u.phone && (
                      <a href={`tel:${u.phone}`} className="text-xs text-blue-600 hover:underline block">
                        {u.phone}
                      </a>
                    )}
                  </div>
                )},
                { key: 'business', header: 'Business', render: (u) => (
                  <div>
                    <p className="text-sm text-gray-800">{u.business_name ?? '—'}</p>
                    {u.is_platform_admin && (
                      <Badge variant="primary" className="mt-1">Platform operator</Badge>
                    )}
                  </div>
                )},
                { key: 'role', header: 'Role', render: (u) => (
                  <span className="text-sm text-gray-700">{displayRole(u)}</span>
                )},
                { key: 'account', header: 'Account', render: (u) => {
                  const status = resolveUserStatus(u);
                  const days = daysInStatus(u);
                  return (
                    <div>
                      <PlatformAccountStatusBadge status={status} />
                      {days !== null && (
                        <p className="text-xs text-gray-400 mt-0.5">{days}d in status</p>
                      )}
                    </div>
                  );
                }},
                { key: 'login', header: 'Login activity', render: (u) => {
                  const activity = resolveUserLoginActivity(u);
                  return (
                    <div>
                      <PlatformActivityStatusBadge status={activity} />
                      <p className="text-xs text-gray-400 mt-0.5">{formatUserLoginRecency(u)}</p>
                    </div>
                  );
                }},
                { key: 'joined', header: 'Joined', render: (u) => (
                  u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'
                )},
                { key: 'actions', header: 'Actions', align: 'center', render: (u) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setNotifyTargets([u])} disabled={actionPending} title="Send notification">
                      <Mail className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStatusTargets([u])} disabled={actionPending} title="Change status">
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRoleTargets([u])} disabled={actionPending} title="Platform role">
                      <UserCog className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTargets([u])} disabled={actionPending} title="Delete user">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
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

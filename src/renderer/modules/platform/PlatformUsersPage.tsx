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
  useUpdatePlatformUserPrivileges,
  useBulkUpdatePlatformUserPrivileges,
} from './api/PlatformUserQueries';
import {
  computePlatformUserStatsFromList,
  formatUserLoginRecency,
  resolveUserLoginActivity,
  resolveUserStatus,
  validateUserStatsDateRange,
} from './api/platformUserValidation';
import type { PlatformUser, UserAccountStatus, UserLoginActivity, PlatformPrivilegesPayload } from './api/PlatformTypes';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { Pagination } from '../../shared/components/tables/Pagination';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { PlatformUserRowActions } from './components/PlatformUserRowActions';
import { PlatformUserModals } from './components/PlatformUserModals';
import { PlatformUserFilters, type BusinessFilterValue } from './components/PlatformUserFilters';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { PlatformAccountStatusBadge } from './components/PlatformAccountStatusBadge';
import { PlatformActivityStatusBadge } from './components/PlatformActivityStatusBadge';
import { PlatformBulkActionBar } from './components/PlatformBulkActionBar';
import { PlatformUserStatCards } from './components/PlatformUserStatCards';
import { Mail, Shield, Trash2, UserCog, KeyRound, CheckSquare, Square, Search } from 'lucide-react';
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
  return '-';
}
type ModalTarget = PlatformUser[];

export default function PlatformUsersPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loginActivityFilter, setLoginActivityFilter] = useState<UserLoginActivity | ''>('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<UserAccountStatus | ''>('');
  const [statusDurationFilter, setStatusDurationFilter] = useState<number | ''>('');
  const [businessFilter, setBusinessFilter] = useState<BusinessFilterValue>('all');
  const [dateFrom, setDateFrom] = useState(defaultRange().from);
  const [dateTo, setDateTo] = useState(defaultRange().to);
  const [dateTouched, setDateTouched] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusTargets, setStatusTargets] = useState<ModalTarget | null>(null);
  const [notifyTargets, setNotifyTargets] = useState<ModalTarget | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ModalTarget | null>(null);
  const [roleTargets, setRoleTargets] = useState<ModalTarget | null>(null);
  const [privilegeTargets, setPrivilegeTargets] = useState<ModalTarget | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const dateValidation = useMemo(
    () => validateUserStatsDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );
  const statsParams = useMemo((): Record<string, string> => {
    if (!dateValidation.valid) return {};
    return { date_from: dateFrom, date_to: dateTo };
  }, [dateFrom, dateTo, dateValidation.valid]);

  const listParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(pageSize),
    };
    if (search.trim()) params.search = search.trim();
    if (accountTypeFilter) params.account_type = accountTypeFilter;
    if (accountStatusFilter) params.status = accountStatusFilter;
    if (statusDurationFilter) params.status_duration_days = String(statusDurationFilter);
    if (loginActivityFilter) params.login_activity = loginActivityFilter;
    if (businessFilter !== 'all') params.business = businessFilter;
    return params;
  }, [search, accountTypeFilter, accountStatusFilter, statusDurationFilter, loginActivityFilter, businessFilter, page, pageSize]);

  const { data: apiStats } = usePlatformUserStats(statsParams, dateValidation.valid);
  const { data, isLoading: listLoading } = usePlatformUsers(listParams);
  const updateStatus = useUpdatePlatformUserStatus();
  const bulkUpdateStatus = useBulkUpdatePlatformUserStatus();
  const notifyUsers = useNotifyPlatformUsers();
  const deleteUser = useDeletePlatformUser();
  const bulkDeleteUsers = useBulkDeletePlatformUsers();
  const bulkAssignRoles = useBulkAssignPlatformRoles();
  const updatePrivileges = useUpdatePlatformUserPrivileges();
  const bulkUpdatePrivileges = useBulkUpdatePlatformUserPrivileges();
  const fallbackStats = useMemo(() => {
    if (!dateValidation.valid || !data?.data) return null;
    return computePlatformUserStatsFromList(data.data, dateFrom, dateTo);
  }, [data, dateFrom, dateTo, dateValidation.valid]);

  const stats = apiStats ?? fallbackStats;

  const rows = useMemo(() => data?.data ?? [], [data]);

  const paginated = {
    data: rows,
    page: data?.current_page ?? page,
    totalPages: Math.max(1, data?.last_page ?? 1),
    totalItems: data?.total ?? rows.length,
    pageSize: data?.per_page ?? pageSize,
    setPage: (p: number) => { setPage(p); setSelectedIds(new Set()); },
    setPageSize: (s: number) => { setPageSize(s); setPage(1); setSelectedIds(new Set()); },
  };

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

  const handleSearchChange = (v: string) => { setSearchInput(v); };
  const handleSearchSubmit = () => { setSearch(searchInput.trim()); setPage(1); };
  const handleSearchClear = () => { setSearchInput(''); setSearch(''); setPage(1); };
  const handleLoginActivityFilterChange = (v: UserLoginActivity | '') => { setLoginActivityFilter(v); setPage(1); };
  const handleStatusDurationFilterChange = (v: number | '') => { setStatusDurationFilter(v); setPage(1); };
  const handleAccountStatusFilterChange = (v: UserAccountStatus | '') => { setAccountStatusFilter(v); setPage(1); };
  const handleBusinessFilterChange = (v: BusinessFilterValue) => { setBusinessFilter(v); setPage(1); };
  const handleAccountTypeFilterChange = (v: string) => { setAccountTypeFilter(v); setPage(1); };

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

  const handlePrivilegesConfirm = (payload: PlatformPrivilegesPayload) => {
    if (!privilegeTargets?.length) return;
    if (privilegeTargets.length === 1) {
      updatePrivileges.mutate(
        { id: privilegeTargets[0].id, payload },
        { onSuccess: () => { setPrivilegeTargets(null); clearSelection(); } },
      );
    } else {
      bulkUpdatePrivileges.mutate(
        { ids: privilegeTargets.map((u) => u.id), payload },
        { onSuccess: () => { setPrivilegeTargets(null); clearSelection(); } },
      );
    }
  };

  const actionPending = updateStatus.isPending || bulkUpdateStatus.isPending || notifyUsers.isPending
    || deleteUser.isPending || bulkDeleteUsers.isPending || bulkAssignRoles.isPending
    || updatePrivileges.isPending || bulkUpdatePrivileges.isPending;
  if (listLoading) return <LoadingSkeleton variant="table" />;

  const rangeLabel = `${stats?.onboarding.range_from ?? dateFrom} to ${stats?.onboarding.range_to ?? dateTo}`;

  return (
    <div className="space-y-6">
      <PlatformUserModals
        state={{ statusTargets, notifyTargets, deleteTargets, roleTargets, privilegeTargets }}
        statusPending={updateStatus.isPending || bulkUpdateStatus.isPending}
        notifyPending={notifyUsers.isPending}
        deletePending={deleteUser.isPending || bulkDeleteUsers.isPending}
        rolePending={bulkAssignRoles.isPending}
        privilegesPending={updatePrivileges.isPending || bulkUpdatePrivileges.isPending}
        onCloseStatus={() => setStatusTargets(null)}
        onCloseNotify={() => setNotifyTargets(null)}
        onCloseDelete={() => setDeleteTargets(null)}
        onCloseRole={() => setRoleTargets(null)}
        onClosePrivileges={() => setPrivilegeTargets(null)}
        onConfirmStatus={handleStatusConfirm}
        onConfirmNotify={handleNotifyConfirm}
        onConfirmDelete={handleDeleteConfirm}
        onConfirmRole={handleRoleConfirm}
        onConfirmPrivileges={handlePrivilegesConfirm}
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
        <PlatformUserStatCards stats={stats} rangeLabel={rangeLabel} />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            placeholder="Search by name, email, phone, business, or role..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
            onClear={handleSearchClear}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleSearchSubmit} className="h-[38px] shrink-0">
          <Search className="w-3.5 h-3.5 mr-1" />Search
        </Button>
        <p className="text-xs text-gray-400 sm:mt-3">
          {rows.length} match{rows.length === 1 ? '' : 'es'} · {data?.total ?? 0} total
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <PlatformUserFilters
            resultCount={rows.length}
            loginActivityFilter={loginActivityFilter}
            onLoginActivityFilterChange={handleLoginActivityFilterChange}
            accountStatusFilter={accountStatusFilter}
            onAccountStatusFilterChange={handleAccountStatusFilterChange}
            statusDurationFilter={statusDurationFilter}
            onStatusDurationFilterChange={handleStatusDurationFilterChange}
            businessFilter={businessFilter}
            onBusinessFilterChange={handleBusinessFilterChange}
            accountTypeFilter={accountTypeFilter}
            onAccountTypeFilterChange={handleAccountTypeFilterChange}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onAssignByEmail={() => setRoleTargets([])}
            actionPending={actionPending}
          />
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
          <Button variant="secondary" size="sm" onClick={() => setPrivilegeTargets(selectedUsers)} disabled={actionPending}>
            <KeyRound className="w-3.5 h-3.5 mr-1" aria-hidden />
            Privileges
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
                    <p className="text-sm text-gray-800">{u.business_name ?? '-'}</p>
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
                  u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'
                )},
                { key: 'actions', header: 'Actions', align: 'center', render: (u) => (
                  <PlatformUserRowActions
                    user={u}
                    onNotify={() => setNotifyTargets([u])}
                    onChangeStatus={() => setStatusTargets([u])}
                    onAssignRoles={() => setRoleTargets([u])}
                    onPrivileges={() => setPrivilegeTargets([u])}
                    onDelete={() => setDeleteTargets([u])}
                    disabled={actionPending}
                  />
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

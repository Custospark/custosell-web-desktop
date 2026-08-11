import { useState, useMemo } from 'react';
import { useStaff, useDetachStaff } from '../api/settings/StaffQueries';
import { useStaffTransfers } from '../api/settings/StaffTransferQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { useLocations } from '../api/settings/LocationQueries';
import { getBusinessOwnerId, getStaffAccountRules } from '../api/settings/staffAccountRules';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useToast } from '../../../app/contexts/useToast';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import StaffFormModal from './StaffFormModal';
import StaffTransferModal from './StaffTransferModal';
import StaffTransferHistoryModal from './StaffTransferHistoryModal';
import LocationFormModal from './LocationFormModal';
import { StaffBranchStatsSection } from './StaffBranchStatsSection';
import { Users, Plus, Pencil, UserMinus, ArrowRightLeft, GitBranch, History } from 'lucide-react';

export default function StaffList() {
  const { data: staff, isLoading, error } = useStaff();
  const { data: transfers } = useStaffTransfers();
  const { data: business } = useBusiness();
  const { data: roles } = useRoles();
  const { data: locations } = useLocations();
  const detachMutation = useDetachStaff();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const authUser = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferStaff, setTransferStaff] = useState<StaffWithSyncMeta | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyStaff, setHistoryStaff] = useState<StaffWithSyncMeta | null>(null);
  const businessOwnerId = getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null });
  const rolesById = useMemo(() => new Map((roles ?? []).filter(Boolean).map((role) => [role.id, role])), [roles]);
  const locationsById = useMemo(() => new Map((locations ?? []).filter(Boolean).map((l) => [l.id, l])), [locations]);

  const branchOptions = useMemo(
    () => (locations ?? []).filter(Boolean).map((l) => ({
      value: String(l.id),
      label: l.is_default ? `${l.name} (Default)` : l.name,
    })),
    [locations],
  );
  const roleOptions = useMemo(
    () => (roles ?? []).filter(Boolean).map((r) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  const branchName = (s: StaffWithSyncMeta): string | null =>
    s.location?.name ?? (s.location_id != null ? locationsById.get(s.location_id)?.name ?? null : null);

  const filtered = useMemo(() => {
    const safeStaff = (staff ?? []).filter(Boolean);
    const q = search.trim().toLowerCase();
    return safeStaff.filter((s) => {
      if (branchFilter && (s.location_id ?? null) !== Number(branchFilter)) return false;
      if (roleFilter && (s.role_id ?? null) !== Number(roleFilter)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q)
        || (s.phone && s.phone.toLowerCase().includes(q))
        || (branchName(s)?.toLowerCase().includes(q) ?? false)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, search, branchFilter, roleFilter, locationsById]);

  const paginated = usePagination(filtered, 10);

  const editingStaff = useMemo(() => {
    if (editingStaffId == null) return null;
    return (staff ?? []).find((s) => s.id === editingStaffId) ?? null;
  }, [editingStaffId, staff]);

  const openCreate = () => { setEditingStaffId(null); setDrawerOpen(true); };
  const openEdit = (s: StaffWithSyncMeta) => {
    setEditingStaffId(s.id);
    setDrawerOpen(true);
  };
  const openTransfer = (s: StaffWithSyncMeta) => {
    setTransferStaff(s);
    setTransferOpen(true);
  };
  const openHistory = (s: StaffWithSyncMeta) => {
    setHistoryStaff(s);
    setHistoryOpen(true);
  };

  const handleDetach = async (s: StaffWithSyncMeta) => {
    const rules = getStaffAccountRules(
      { ...s, role: s.role ?? (s.role_id != null ? rolesById.get(s.role_id) : null) ?? null },
      { currentUserId: authUser?.id ?? null, businessOwnerId },
    );
    if (!rules.canDetach) {
      showToast('error', rules.detachBlockedReason ?? 'This staff account cannot be detached.');
      return;
    }

    const confirmed = await confirm({
      title: 'Detach Staff',
      message: 'Remove from this organization? Their login stays; they won’t access this business.',
      confirmText: 'Detach',
      variant: 'danger',
    });
    if (confirmed) detachMutation.mutate(s.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<Users className="w-12 h-12" />} title="Failed to load staff"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your staff users and their roles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setBranchModalOpen(true)}><GitBranch className="w-4 h-4 mr-1.5" />Add Branch</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Staff</Button>
        </div>
      </div>

      <StaffBranchStatsSection
        staff={staff}
        locations={locations}
        transfers={transfers}
        isLoading={isLoading}
      />

      <div className="mt-6">
      <Card>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <SearchInput placeholder="Search staff by name, email, phone or branch..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter by branch"
          >
            <option value="">All branches</option>
            {branchOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Table<StaffWithSyncMeta>
          rowKey={(s) => s.id}
          minWidth="52rem"
          columns={[
            { key: 'index', header: '#', render: (_item, idx) => (paginated.page - 1) * paginated.pageSize + idx + 1 },
            { key: 'name', header: 'Name', render: (item) => (
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  {getStaffAccountRules(
                    { ...item, role: item.role ?? (item.role_id != null ? rolesById.get(item.role_id) : null) ?? null },
                    { currentUserId: authUser?.id ?? null, businessOwnerId },
                  ).labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {label}
                    </span>
                  ))}
                  {item._syncFailed ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      title={item._lastError || 'Sync failed'}
                    >
                      Sync failed
                    </span>
                  ) : item._pendingSync && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending sync
                    </span>
                  )}
                </div>
              ),
            },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Phone', render: (item) => {
                const phone = item.phone || (item.id === businessOwnerId ? business?.phone : null) || null;
                return phone || <span className="text-gray-400">—</span>;
              } },
            { key: 'role', header: 'Role', render: (item) => item.role?.name || <span className="text-gray-400">—</span> },
            { key: 'branch', header: 'Branch', render: (item) => {
                const name = branchName(item);
                return name
                  ? <span className="inline-flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-gray-400" />{name}</span>
                  : <span className="text-gray-400">—</span>;
              } },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openHistory(item); }} title="Transfer history"><History className="w-4 h-4 text-gray-500" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openTransfer(item); }} title="Transfer to another branch"><ArrowRightLeft className="w-4 h-4 text-indigo-500" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  {(() => {
                    const rules = getStaffAccountRules(
                      { ...item, role: item.role ?? (item.role_id != null ? rolesById.get(item.role_id) : null) ?? null },
                      { currentUserId: authUser?.id ?? null, businessOwnerId },
                    );
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDetach(item); }}
                        title={rules.detachBlockedReason ?? 'Detach'}
                        disabled={!rules.canDetach || detachMutation.isPending}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    );
                  })()}
                </div>
              ),
            },
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
      </Card>
      </div>

      <StaffFormModal
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingStaffId(null);
        }}
        staff={editingStaff}
      />

      <LocationFormModal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        location={null}
      />

      <StaffTransferModal
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          setTransferStaff(null);
        }}
        staff={transferStaff}
      />

      <StaffTransferHistoryModal
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryStaff(null);
        }}
        staff={historyStaff}
      />
    </>
  );
}

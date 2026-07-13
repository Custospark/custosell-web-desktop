import { useState, useMemo } from 'react';
import { useStaff, useDetachStaff } from '../api/settings/StaffQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
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
import { Users, Plus, Pencil, UserMinus } from 'lucide-react';

export default function StaffList() {
  const { data: staff, isLoading, error } = useStaff();
  const { data: business } = useBusiness();
  const { data: roles } = useRoles();
  const detachMutation = useDetachStaff();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const authUser = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const businessOwnerId = getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null });
  const rolesById = useMemo(() => new Map((roles ?? []).filter(Boolean).map((role) => [role.id, role])), [roles]);

  const filtered = useMemo(() => {
    const safeStaff = (staff ?? []).filter(Boolean);
    if (!search.trim()) return safeStaff;
    const q = search.toLowerCase();
    return safeStaff.filter((s) =>
      s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [staff, search]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your staff users and their roles</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Staff</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput placeholder="Search staff by name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        </div>
        <Table<StaffWithSyncMeta>
          rowKey={(s) => s.id}
          columns={[
            { key: 'id', header: '#' },
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
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
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

      <StaffFormModal
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingStaffId(null);
        }}
        staff={editingStaff}
      />
    </>
  );
}

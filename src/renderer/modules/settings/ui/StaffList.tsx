import { useState, useMemo } from 'react';
import { useStaff, useDeleteStaff } from '../api/settings/StaffQueries';
import type { StaffWithSyncMeta } from '../../../app/store/offline/localStaffStore';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import StaffFormDrawer from './StaffFormDrawer';
import { Users, Plus, Pencil, Trash, BadgeCheck, BadgeX } from 'lucide-react';

export default function StaffList() {
  const { data: staff, isLoading, error } = useStaff();
  const deleteMutation = useDeleteStaff();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithSyncMeta | null>(null);

  const filtered = useMemo(() => {
    const safeStaff = (staff ?? []).filter(Boolean);
    if (!search.trim()) return safeStaff;
    const q = search.toLowerCase();
    return safeStaff.filter((s) =>
      s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [staff, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingStaff(null); setDrawerOpen(true); };
  const openEdit = (s: StaffWithSyncMeta) => {
    if (s._pendingSync) return;
    setEditingStaff(s);
    setDrawerOpen(true);
  };

  const handleDelete = async (s: StaffWithSyncMeta) => {
    if (s._pendingSync) return;
    const confirmed = await confirm({
      title: 'Delete Staff',
      message: `Are you sure you want to delete "${s.name}"? This cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(s.id);
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
                  {item._pendingSync && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending sync</span>
                  )}
                </div>
              ),
            },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Phone', render: (item) => item.phone || <span className="text-gray-400">—</span> },
            { key: 'role', header: 'Role', render: (item) => item.role?.name || <span className="text-gray-400">—</span> },
            { key: 'is_active', header: 'Status', render: (item) => item.is_active
              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><BadgeCheck className="w-3 h-3" />Active</span>
              : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><BadgeX className="w-3 h-3" />Inactive</span>
            },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="sm" disabled={item._pendingSync} onClick={(e) => { e.stopPropagation(); openEdit(item); }} title={item._pendingSync ? 'Sync pending before editing' : 'Edit'}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" disabled={item._pendingSync} onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title={item._pendingSync ? 'Sync pending before deleting' : 'Delete'}><Trash className="w-4 h-4 text-red-500" /></Button>
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

      <StaffFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        staff={editingStaff}
      />
    </>
  );
}

import { useState, useMemo } from 'react';
import { useRoles, useDeleteRole } from '../api/settings/RoleQueries';
import type { RoleWithSyncMeta } from '../../../app/store/offline/settings/localRolesStore';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import RoleFormModal from './RoleFormModal';
import { Shield, Plus, Pencil, Trash, Star } from 'lucide-react';

export default function RoleList() {
  const { data: roles, isLoading, error } = useRoles();
  const deleteMutation = useDeleteRole();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithSyncMeta | null>(null);

  const filtered = useMemo(() => {
    const safeRoles = (roles ?? []).filter(Boolean);
    if (!search.trim()) return safeRoles;
    const q = search.toLowerCase();
    return safeRoles.filter((r) =>
      r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
    );
  }, [roles, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingRole(null); setDrawerOpen(true); };
  const openEdit = (r: RoleWithSyncMeta) => {
    setEditingRole(r);
    setDrawerOpen(true);
  };

  const handleDelete = async (r: RoleWithSyncMeta) => {
    if (r.is_system) return;
    const confirmed = await confirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete "${r.name}"? This cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(r.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<Shield className="w-12 h-12" />} title="Failed to load roles"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Organize staff by job title — module access is set per staff member</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Role</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput placeholder="Search roles by name or slug..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        </div>
        <Table<RoleWithSyncMeta>
          minWidth="40rem"
          rowKey={(r) => r.id}
          columns={[
            { key: 'index', header: '#', render: (_item, idx) => (paginated.page - 1) * paginated.pageSize + idx + 1 },
            { key: 'name', header: 'Name', render: (item) => (
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  {item.is_system && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      System
                    </span>
                  )}
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
            { key: 'slug', header: 'Slug' },
            { key: 'description', header: 'Description', render: (item) => {
                const desc = item.description || '';
                return desc.length > 50 ? desc.slice(0, 50) + '...' : desc || <span className="text-gray-400">—</span>;
              },
            },
            { key: 'is_default', header: 'Default', render: (item) => item.is_default
              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Star className="w-3 h-3" />Default</span>
              : <span className="text-gray-400">—</span>
            },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  {!item.is_system && (
                    <>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete"><Trash className="w-4 h-4 text-red-500" /></Button>
                    </>
                  )}
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

      <RoleFormModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={editingRole}
      />
    </>
  );
}

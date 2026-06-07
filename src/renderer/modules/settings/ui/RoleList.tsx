import { useState, useMemo } from 'react';
import { useRoles, useDeleteRole } from '../api/settings/RoleQueries';
import type { RoleWithSyncMeta } from '../../../app/store/offline/localRolesStore';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import RoleFormDrawer from './RoleFormDrawer';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Define roles and control access permissions</p>
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
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: '#' },
            { key: 'name', header: 'Name', render: (item) => (
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
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
            { key: 'permissions', header: 'Permissions', render: (item) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {item.permissions.slice(0, 3).map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">{p}</span>
                  ))}
                  {item.permissions.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">+{item.permissions.length - 3}</span>
                  )}
                </div>
              ),
            },
            { key: 'is_default', header: 'Default', render: (item) => item.is_default
              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Star className="w-3 h-3" />Default</span>
              : <span className="text-gray-400">—</span>
            },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete"><Trash className="w-4 h-4 text-red-500" /></Button>
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

      <RoleFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={editingRole}
      />
    </>
  );
}

import { useMemo, useState } from 'react';
import {
  useDeletePlatformRole,
  usePlatformRoles,
} from './api/PlatformUserQueries';
import type { PlatformRole } from './api/PlatformTypes';
import { PlatformRoleFormModal } from './components/PlatformRoleFormModal';
import { PlatformRoleMembersModal } from './components/PlatformRoleMembersModal';
import { Button } from '../../shared/components/buttons/Button';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Card } from '../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Shield, Plus, Pencil, Trash2, Users } from 'lucide-react';

const BUILT_IN_ROLES = ['platform-admin', 'platform-analyst', 'platform-support'];

export default function PlatformRolesPage() {
  const { data: roles = [], isLoading, error } = usePlatformRoles();
  const deleteMutation = useDeletePlatformRole();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null);
  const [membersFor, setMembersFor] = useState<PlatformRole | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.permissions.some((p) => p.toLowerCase().includes(q)),
    );
  }, [roles, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingRole(null); setModalOpen(true); };
  const openEdit = (r: PlatformRole) => { setEditingRole(r); setModalOpen(true); };

  const handleDelete = async (r: PlatformRole) => {
    if (BUILT_IN_ROLES.includes(r.name)) return;
    const confirmed = await confirm({
      title: 'Delete platform role',
      message: `Delete "${r.name}"? Users with this role will lose those permissions.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(r.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState
        icon={<Shield className="w-12 h-12" />}
        title="Failed to load platform roles"
        description={error.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <PlatformRoleFormModal
        key={editingRole?.id ?? 'create'}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        role={editingRole}
      />
      <PlatformRoleMembersModal open={membersFor !== null} role={membersFor} onClose={() => setMembersFor(null)} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage operator roles and permissions for the Custosell platform</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add role</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search roles or permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
        </div>

        <Table<PlatformRole>
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'index', header: '#',
              render: (_r: PlatformRole, idx: number) => (
                <span className="text-sm text-gray-400">{idx + 1}</span>
              ),
            },
            { key: 'name', header: 'Role', render: (r) => (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{r.name}</span>
                {BUILT_IN_ROLES.includes(r.name) && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Built-in
                  </span>
                )}
              </div>
            )},
            { key: 'permissions', header: 'Permissions', render: (r) => (
              <span className="text-sm text-gray-600">{r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}</span>
            )},
            { key: 'members', header: 'Members', render: (r) => (
              <span className="text-sm text-gray-700">{r.users_count ?? 0}</span>
            )},
            { key: 'actions', header: 'Actions', render: (r) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setMembersFor(r)} title="Manage members">
                  <Users className="w-3.5 h-3.5" />
                </Button>
                {!BUILT_IN_ROLES.includes(r.name) && (
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Rename role">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {!BUILT_IN_ROLES.includes(r.name) && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} disabled={deleteMutation.isPending} title="Delete role">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                )}
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
      </Card>
    </>
  );
}

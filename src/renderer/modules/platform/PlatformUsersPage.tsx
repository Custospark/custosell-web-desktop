import { useMemo, useState } from 'react';
import { usePlatformUsers, useUpdatePlatformUserStatus } from './api/PlatformQueries';
import type { PlatformUser } from './api/PlatformTypes';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { Users, UserX, UserCheck } from 'lucide-react';

export default function PlatformUsersPage() {
  const [search, setSearch] = useState('');
  const params = useMemo(() => {
    const p: Record<string, string> = { per_page: '50' };
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search]);

  const { data, isLoading } = usePlatformUsers(params);
  const updateStatus = useUpdatePlatformUserStatus();
  const { confirm } = useConfirm();

  const handleStatus = async (user: PlatformUser) => {
    const deactivating = user.is_active;
    const reason = deactivating
      ? window.prompt('Reason for deactivation (optional):') ?? undefined
      : undefined;

    const ok = await confirm({
      title: deactivating ? 'Deactivate User' : 'Reactivate User',
      message: deactivating
        ? `Deactivate "${user.name}" (${user.email})?`
        : `Reactivate "${user.name}"?`,
      confirmText: deactivating ? 'Deactivate' : 'Reactivate',
      variant: deactivating ? 'danger' : 'warning',
    });

    if (!ok) return;

    updateStatus.mutate({ id: user.id, is_active: !deactivating, reason });
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">All Users</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-tenant user accounts on Custosell</p>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>

        <Table<PlatformUser>
          rowKey={(u) => u.id}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'business', header: 'Business', render: (u) => u.business_name ?? '—' },
            { key: 'role', header: 'Role', render: (u) => u.role_name ?? '—' },
            { key: 'status', header: 'Status', render: (u) => (
              <Badge variant={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
            )},
            { key: 'last_login', header: 'Last login', render: (u) => u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—' },
            { key: 'actions', header: '', render: (u) => (
              <Button variant={u.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => void handleStatus(u)} disabled={updateStatus.isPending}>
                {u.is_active ? <><UserX className="w-3.5 h-3.5 mr-1" />Deactivate</> : <><UserCheck className="w-3.5 h-3.5 mr-1" />Reactivate</>}
              </Button>
            )},
          ]}
          data={data?.data ?? []}
        />
      </Card>
    </>
  );
}

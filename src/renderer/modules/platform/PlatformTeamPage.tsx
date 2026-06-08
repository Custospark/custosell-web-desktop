import { useState } from 'react';
import {
  useAssignPlatformRole,
  usePlatformPermissions,
  usePlatformRoles,
  usePlatformTeam,
  useRevokePlatformRole,
} from './api/PlatformQueries';
import type { PlatformUser } from './api/PlatformTypes';
import { Card } from '../../shared/components/cards/Card';
import { Table } from '../../shared/components/tables/Table';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { Shield, UserPlus, X } from 'lucide-react';

export default function PlatformTeamPage() {
  const { data: team, isLoading: teamLoading } = usePlatformTeam();
  const { data: roles, isLoading: rolesLoading } = usePlatformRoles();
  const { data: permissions } = usePlatformPermissions();
  const assignRole = useAssignPlatformRole();
  const revokeRole = useRevokePlatformRole();
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('platform-analyst');

  const handleAssign = () => {
    const userId = parseInt(assignUserId, 10);
    if (!userId || !assignRoleName) return;
    assignRole.mutate({ userId, role: assignRoleName });
    setAssignUserId('');
  };

  if (teamLoading || rolesLoading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Platform Team</h1>
        <p className="text-sm text-gray-500 mt-1">Custosell operators with platform access</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Assign platform role to user</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            placeholder="User ID"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1"
          />
          <select
            value={assignRoleName}
            onChange={(e) => setAssignRoleName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {(roles ?? []).map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
          <Button onClick={handleAssign} disabled={assignRole.isPending}>
            <UserPlus className="w-4 h-4 mr-1.5" />Assign
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Platform team members</h2>
        <Table<PlatformUser>
          rowKey={(u) => u.id}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'business', header: 'Business', render: (u) => u.business_name ?? '—' },
            { key: 'roles', header: 'Platform roles', render: (u) => (
              <div className="flex flex-wrap gap-1">
                {(u.platform_roles ?? []).map((role) => (
                  <span key={role} className="inline-flex items-center gap-1">
                    <Badge variant="primary">{role}</Badge>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => revokeRole.mutate({ userId: u.id, role })}
                      title="Revoke role"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )},
          ]}
          data={team?.data ?? []}
        />
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Platform roles</h2>
        <div className="space-y-4">
          {(roles ?? []).map((role) => (
            <div key={role.id} className="border border-gray-100 rounded-lg p-4">
              <p className="font-medium text-gray-900">{role.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {role.permissions.map((p) => (
                  <Badge key={p} variant="neutral">{p}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        {permissions && permissions.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">{permissions.length} platform permissions defined</p>
        )}
      </Card>
    </div>
  );
}

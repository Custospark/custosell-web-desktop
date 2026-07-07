import { useMemo, useState } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { ProjectMember, ProjectMemberRole } from '../api/projectTypes';
import { UserPlus, X } from 'lucide-react';

const ROLE_OPTIONS: { value: ProjectMemberRole; label: string; hint: string }[] = [
  { value: 'viewer', label: 'Viewer', hint: 'View board and tasks' },
  { value: 'contributor', label: 'Contributor', hint: 'Move cards and add tasks' },
  { value: 'manager', label: 'Manager', hint: 'Manage team on this project' },
];

interface ProjectMemberPickerProps {
  members: ProjectMember[];
  onAdd: (userId: number, role: ProjectMemberRole) => void;
  onRemove: (userId: number) => void;
  onRoleChange: (userId: number, role: ProjectMemberRole) => void;
  loading?: boolean;
}

export default function ProjectMemberPicker({
  members,
  onAdd,
  onRemove,
  onRoleChange,
  loading,
}: ProjectMemberPickerProps) {
  const { data: staff = [] } = useStaff();
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('contributor');

  const availableStaff = useMemo(
    () => staff.filter((s) => !members.some((m) => m.user_id === s.id)),
    [staff, members],
  );

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd(Number(selectedUserId), selectedRole);
    setSelectedUserId('');
    setSelectedRole('contributor');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">Team member</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select staff…</option>
            {availableStaff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!selectedUserId || loading}
          className="inline-flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">No collaborators yet. Invite staff to give board access without full Estimates module.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{member.user?.name ?? `User #${member.user_id}`}</p>
                <p className="text-xs text-gray-500">{ROLE_OPTIONS.find((r) => r.value === member.role)?.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) => onRoleChange(member.user_id, e.target.value as ProjectMemberRole)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                  disabled={loading}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onRemove(member.user_id)}
                  className={cn('rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600')}
                  disabled={loading}
                  aria-label="Remove member"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

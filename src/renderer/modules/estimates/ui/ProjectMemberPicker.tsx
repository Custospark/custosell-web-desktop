import { useMemo, useState } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { ProjectMember, ProjectMemberRole } from '../api/projectTypes';
import { UserPlus, X, Loader2 } from 'lucide-react';

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
  lockedUserId?: number;
  canManage?: boolean;
  loading?: boolean;
  isLoading?: boolean;
}

export default function ProjectMemberPicker({
  members,
  onAdd,
  onRemove,
  onRoleChange,
  lockedUserId,
  canManage = true,
  loading,
  isLoading,
}: ProjectMemberPickerProps) {
  const { data: staff = [] } = useStaff();
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('contributor');
  const [search, setSearch] = useState('');

  const availableStaff = useMemo(
    () => staff.filter((s) => !members.some((m) => m.user_id === s.id)),
    [staff, members],
  );

  const query = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!query) return members;
    return members.filter((member) => {
      const name = member.user?.name ?? `User #${member.user_id}`;
      return name.toLowerCase().includes(query);
    });
  }, [members, query]);

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd(Number(selectedUserId), selectedRole);
    setSelectedUserId('');
    setSelectedRole('contributor');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 py-10 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        Loading team members…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
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
      )}

      {!canManage && (
        <p className="text-xs text-gray-500">
          You can view the project team. Only managers can invite members or change roles.
        </p>
      )}

      {members.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
      )}

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">
          {canManage
            ? 'No collaborators yet. Invite staff to give board access without full Estimates module.'
            : 'No team members listed yet.'}
        </p>
      ) : (
        <>
          <ul className="max-h-[280px] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 pr-1">
            {filteredMembers.map((member) => {
              const isLockedOwner = member.user_id === lockedUserId;
              const roleMeta = ROLE_OPTIONS.find((r) => r.value === member.role);
              return (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user?.name ?? `User #${member.user_id}`}
                      {isLockedOwner && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{roleMeta?.hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => onRoleChange(member.user_id, e.target.value as ProjectMemberRole)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          disabled={loading || isLockedOwner}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onRemove(member.user_id)}
                          className={cn(
                            'rounded-lg p-1.5 text-gray-400',
                            isLockedOwner ? 'cursor-not-allowed opacity-50' : 'hover:bg-red-50 hover:text-red-600',
                          )}
                          disabled={loading || isLockedOwner}
                          aria-label="Remove member"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                        {roleMeta?.label ?? member.role}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-500">
            Showing {filteredMembers.length} of {members.length} member{members.length === 1 ? '' : 's'}.
            {lockedUserId ? ' Project owner cannot be removed or reassigned.' : ''}
          </p>
        </>
      )}

      {members.length > 0 && filteredMembers.length === 0 && (
        <p className="text-xs text-gray-500">No team members match your search.</p>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import type { BoardMemberInput } from '../api/pipelineTypes';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { Eye, Pencil, UserPlus, X } from 'lucide-react';

interface BoardMemberPickerProps {
  value: BoardMemberInput[];
  onChange: (members: BoardMemberInput[]) => void;
  excludeUserId?: number;
  lockedUserId?: number;
  canManage?: boolean;
  className?: string;
}

const ROLE_LABELS: Record<BoardMemberInput['role'], string> = {
  editor: 'Can edit',
  viewer: 'View only',
};

function memberDisplayName(member: BoardMemberInput, staffName?: string): string {
  return member.name ?? staffName ?? `Team member #${member.user_id}`;
}

export default function BoardMemberPicker({
  value,
  onChange,
  excludeUserId,
  lockedUserId,
  canManage = true,
  className,
}: BoardMemberPickerProps) {
  const { data: staff = [] } = useStaff();
  const [search, setSearch] = useState('');

  const available = useMemo(
    () => staff.filter((u) => u.id !== excludeUserId && !value.some((m) => m.user_id === u.id)),
    [staff, value, excludeUserId],
  );
  const query = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!query) return value;
    return value.filter((member) => {
      const displayName = memberDisplayName(member, staff.find((u) => u.id === member.user_id)?.name);
      return displayName.toLowerCase().includes(query);
    });
  }, [query, staff, value]);

  const staffNameFor = (userId: number) => staff.find((u) => u.id === userId)?.name;

  const addMember = (userId: number) => {
    if (!canManage) return;
    const person = staff.find((u) => u.id === userId);
    onChange([...value, { user_id: userId, role: 'editor', name: person?.name }]);
  };

  const removeMember = (userId: number) => {
    if (!canManage) return;
    onChange(value.filter((m) => m.user_id !== userId));
  };

  const setRole = (userId: number, role: 'editor' | 'viewer') => {
    if (!canManage) return;
    onChange(value.map((m) => (m.user_id === userId ? { ...m, role } : m)));
  };

  if (!canManage) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-xs text-gray-500">
          You can view the board team. Only the board owner or managers can invite members or change roles.
        </p>
        {value.length === 0 ? (
          <p className="text-xs text-gray-400">No additional members on this board.</p>
        ) : (
          <ul className="space-y-2">
            {value.map((member) => (
              <li key={member.user_id} className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-800">
                {memberDisplayName(member, staffNameFor(member.user_id))}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <UserPlus className="h-4 w-4 text-gray-500" />
        Team members
      </div>

      {value.length > 0 && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invited members..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredMembers.map((member) => {
            const isLockedOwner = member.user_id === lockedUserId;
            const displayName = memberDisplayName(member, staffNameFor(member.user_id));
            const staffMember = staff.find((u) => u.id === member.user_id);
            return (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserIdentityChip
                        name={displayName}
                        avatar={staffMember?.avatar}
                        size="sm"
                        nameClassName="text-sm font-semibold text-gray-900"
                      />
                      {isLockedOwner && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 pl-9 text-xs text-gray-500">{ROLE_LABELS[member.role]}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRole(member.user_id, 'editor')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                      member.role === 'editor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200',
                    )}
                    title="Can edit cards"
                    disabled={isLockedOwner}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(member.user_id, 'viewer')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                      member.role === 'viewer' ? 'bg-slate-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200',
                    )}
                    title="View only"
                    disabled={isLockedOwner}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(member.user_id)}
                    className={cn(
                      'rounded p-1 text-gray-400',
                      isLockedOwner ? 'cursor-not-allowed opacity-50' : 'hover:bg-red-50 hover:text-red-600',
                    )}
                    aria-label={`Remove ${displayName}`}
                    disabled={isLockedOwner}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
          {filteredMembers.length === 0 && (
            <p className="text-xs text-gray-500">No invited members match your search.</p>
          )}
        </>
      )}

      {available.length > 0 ? (
        <select
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          value=""
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) addMember(id);
          }}
        >
          <option value="">Add a team member…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      ) : value.length === 0 ? (
        <p className="text-xs text-gray-500">No members added yet. Use the dropdown above to invite staff.</p>
      ) : (
        <p className="text-xs text-gray-500">All staff are already on this board.</p>
      )}
    </div>
  );
}

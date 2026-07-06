import { useMemo } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import type { BoardMemberInput } from '../api/pipelineTypes';
import { cn } from '../../../shared/utils/cn';
import { Eye, Pencil, UserPlus, X } from 'lucide-react';

interface BoardMemberPickerProps {
  value: BoardMemberInput[];
  onChange: (members: BoardMemberInput[]) => void;
  excludeUserId?: number;
  className?: string;
}

const ROLE_LABELS: Record<BoardMemberInput['role'], string> = {
  editor: 'Can edit',
  viewer: 'View only',
};

function memberDisplayName(member: BoardMemberInput, staffName?: string): string {
  return member.name ?? staffName ?? `Team member #${member.user_id}`;
}

export default function BoardMemberPicker({ value, onChange, excludeUserId, className }: BoardMemberPickerProps) {
  const { data: staff = [] } = useStaff();

  const available = useMemo(
    () => staff.filter((u) => u.id !== excludeUserId && !value.some((m) => m.user_id === u.id)),
    [staff, value, excludeUserId],
  );

  const staffNameFor = (userId: number) => staff.find((u) => u.id === userId)?.name;

  const addMember = (userId: number) => {
    const person = staff.find((u) => u.id === userId);
    onChange([...value, { user_id: userId, role: 'editor', name: person?.name }]);
  };

  const removeMember = (userId: number) => {
    onChange(value.filter((m) => m.user_id !== userId));
  };

  const setRole = (userId: number, role: 'editor' | 'viewer') => {
    onChange(value.map((m) => (m.user_id === userId ? { ...m, role } : m)));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <UserPlus className="h-4 w-4 text-gray-500" />
        Team members
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((member) => {
            const displayName = memberDisplayName(member, staffNameFor(member.user_id));
            return (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{ROLE_LABELS[member.role]}</p>
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
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(member.user_id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${displayName}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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

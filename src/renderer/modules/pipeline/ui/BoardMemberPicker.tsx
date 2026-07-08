import { useMemo, useState } from 'react';
import { useBoardTeamMembers } from '../api/usePipelineQueries';
import type { BoardMemberInput } from '../api/pipelineTypes';
import type { BoardMemberRole } from '../api/boardRoleUtils';
import {
  BOARD_ROLE_BADGE_CLASS,
  BOARD_ROLE_HINTS,
  BOARD_ROLE_LABELS,
  normalizeBoardMemberRole,
} from '../api/boardRoleUtils';
import { Button } from '../../../shared/components/buttons/Button';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import type { BoardWorkspace } from './boardVisibilityOptions';
import { UserPlus, X, Loader2 } from 'lucide-react';

const pickerInputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const pickerSelectCompactClass =
  'rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const ROLE_OPTIONS: Array<{ value: BoardMemberRole; label: string; hint: string }> = [
  { value: 'viewer', label: BOARD_ROLE_LABELS.viewer, hint: BOARD_ROLE_HINTS.viewer },
  { value: 'contributor', label: BOARD_ROLE_LABELS.contributor, hint: BOARD_ROLE_HINTS.contributor },
  { value: 'manager', label: BOARD_ROLE_LABELS.manager, hint: BOARD_ROLE_HINTS.manager },
];

interface BoardMemberPickerProps {
  workspace: BoardWorkspace;
  value: BoardMemberInput[];
  onChange: (members: BoardMemberInput[]) => void;
  excludeUserId?: number;
  lockedUserId?: number;
  canManage?: boolean;
  className?: string;
  loadTeamMembers?: boolean;
}

function memberDisplayName(member: BoardMemberInput, staffName?: string): string {
  return member.name ?? staffName ?? `Team member #${member.user_id}`;
}

export default function BoardMemberPicker({
  workspace: _workspace,
  value,
  onChange,
  excludeUserId,
  lockedUserId,
  canManage = true,
  className,
  loadTeamMembers = true,
}: BoardMemberPickerProps) {
  const { data: teamMembers = [], isLoading, isFetching } = useBoardTeamMembers(_workspace, {
    enabled: loadTeamMembers,
    scope: 'business',
  });
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<BoardMemberRole>('contributor');
  const [search, setSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const staffLoading = isLoading || (isFetching && teamMembers.length === 0);

  const availableStaff = useMemo(
    () => teamMembers.filter((u) => u.id !== excludeUserId && !value.some((m) => m.user_id === u.id)),
    [teamMembers, value, excludeUserId],
  );

  const staffQuery = staffSearch.trim().toLowerCase();
  const filteredAvailableStaff = useMemo(() => {
    if (!staffQuery) return availableStaff;
    return availableStaff.filter(
      (u) =>
        u.name.toLowerCase().includes(staffQuery)
        || (u.email?.toLowerCase().includes(staffQuery) ?? false),
    );
  }, [availableStaff, staffQuery]);

  const query = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!query) return value;
    return value.filter((member) => {
      const displayName = memberDisplayName(member, teamMembers.find((u) => u.id === member.user_id)?.name);
      return displayName.toLowerCase().includes(query);
    });
  }, [query, teamMembers, value]);

  const handleAdd = () => {
    if (!selectedUserId || !canManage) return;
    const person = teamMembers.find((u) => u.id === selectedUserId);
    onChange([...value, { user_id: Number(selectedUserId), role: selectedRole, name: person?.name }]);
    setSelectedUserId('');
    setSelectedRole('contributor');
  };

  const roleMeta = (role: string) => {
    const normalized = normalizeBoardMemberRole(role);
    return ROLE_OPTIONS.find((r) => r.value === normalized) ?? ROLE_OPTIONS[0];
  };

  if (staffLoading) {
    return (
      <div className={cn('flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 py-10 text-sm text-blue-700', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
        Loading business staff…
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-xs text-gray-500">
          You can view the board team. Only board owners and managers can invite members or change roles.
        </p>
        {value.length === 0 ? (
          <p className="text-xs text-gray-400">No additional members on this board.</p>
        ) : (
          <ul className="max-h-[280px] divide-y divide-indigo-100/80 overflow-y-auto rounded-xl border border-indigo-100 bg-indigo-50/20 pr-1">
            {value.map((member) => {
              const staffMember = teamMembers.find((u) => u.id === member.user_id);
              const meta = roleMeta(member.role);
              return (
                <li key={member.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <UserIdentityChip
                      name={memberDisplayName(member, staffMember?.name)}
                      avatar={staffMember?.avatar}
                      size="sm"
                      nameClassName="text-sm font-medium text-gray-900"
                    />
                    <p className="mt-0.5 pl-9 text-xs text-gray-500">{meta.hint}</p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', BOARD_ROLE_BADGE_CLASS[meta.value])}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <input
        type="search"
        value={staffSearch}
        onChange={(e) => setStaffSearch(e.target.value)}
        placeholder="Search staff by name or email…"
        className={pickerInputClass}
      />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-700">Staff member</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
            className={pickerInputClass}
            aria-label="Staff member to invite"
          >
            <option value="">Select staff…</option>
            {filteredAvailableStaff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.email ? ` — ${u.email}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as BoardMemberRole)}
            className={pickerInputClass}
            aria-label="Member role"
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
          disabled={!selectedUserId}
          className="inline-flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Invite
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">Viewer</span> — view only ·{' '}
        <span className="font-medium text-gray-700">Contributor</span> — move cards & columns ·{' '}
        <span className="font-medium text-gray-700">Manager</span> — settings, archive & delete
      </p>

      {filteredAvailableStaff.length === 0 && staffQuery && (
        <p className="text-xs text-gray-500">No staff match your search.</p>
      )}

      {availableStaff.length === 0 && value.length === 0 && (
        <p className="text-sm text-gray-500">
          {teamMembers.length === 0
            ? 'No active staff were found in your business.'
            : 'No collaborators yet. Invite staff to share this board without giving everyone team access.'}
        </p>
      )}

      {value.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invited members…"
          className={pickerInputClass}
        />
      )}

      {value.length > 0 ? (
        <>
          <ul className="max-h-[280px] divide-y divide-indigo-100/80 overflow-y-auto rounded-xl border border-indigo-100 bg-indigo-50/20 pr-1">
            {filteredMembers.map((member) => {
              const isLockedOwner = member.user_id === lockedUserId;
              const meta = roleMeta(member.role);
              const displayName = memberDisplayName(member, teamMembers.find((u) => u.id === member.user_id)?.name);
              const staffMember = teamMembers.find((u) => u.id === member.user_id);
              return (
                <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserIdentityChip
                        name={displayName}
                        avatar={staffMember?.avatar}
                        size="sm"
                        nameClassName="text-sm font-medium text-gray-900"
                      />
                      {isLockedOwner && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 pl-9 text-xs text-gray-500">{meta.hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={normalizeBoardMemberRole(member.role)}
                      onChange={(e) => {
                        const role = e.target.value as BoardMemberRole;
                        onChange(value.map((m) => (m.user_id === member.user_id ? { ...m, role } : m)));
                      }}
                      className={pickerSelectCompactClass}
                      disabled={isLockedOwner}
                      aria-label={`Role for ${displayName}`}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((m) => m.user_id !== member.user_id))}
                      className={cn(
                        'rounded-lg p-1.5 text-gray-400',
                        isLockedOwner ? 'cursor-not-allowed opacity-50' : 'hover:bg-red-50 hover:text-red-600',
                      )}
                      disabled={isLockedOwner}
                      aria-label={`Remove ${displayName}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-500">
            Showing {filteredMembers.length} of {value.length} member{value.length === 1 ? '' : 's'}.
            {lockedUserId ? ' Board owner cannot be removed or reassigned.' : ''}
          </p>
        </>
      ) : null}

      {value.length > 0 && filteredMembers.length === 0 && (
        <p className="text-xs text-gray-500">No invited members match your search.</p>
      )}
    </div>
  );
}

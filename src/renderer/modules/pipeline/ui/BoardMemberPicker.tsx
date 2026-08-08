import { useMemo, useState } from 'react';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
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
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { UserPlus, X, Loader2, Search, AlertCircle } from 'lucide-react';
import { useUserLookup } from '../../../shared/api/account/useUserLookup';

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
  maxBoardMembers?: number | null;
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
  maxBoardMembers,
}: BoardMemberPickerProps) {
  const { data: teamMembers = [], isLoading, isFetching } = useBoardTeamMembers(_workspace, {
    enabled: loadTeamMembers,
    scope: 'business',
  });
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<BoardMemberRole>('contributor');
  const [sendNotification, setSendNotification] = useState(true);
  const [search, setSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [lookupResult, setLookupResult] = useState<{ id: number; name: string; email: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const subscription = useAppSelector((s) => s.auth.user?.business?.subscription);
  const lookupMutation = useUserLookup();
  const { confirm } = useConfirm();

  const handleRemove = async (memberUserId: number, memberName: string) => {
    const confirmed = await confirm({
      title: `Remove ${memberName}?`,
      message: `${memberName} will lose access to this board and won't be able to view or contribute to it anymore.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) onChange(value.filter((m) => m.user_id !== memberUserId));
  };

  const staffLoading = isLoading || (isFetching && teamMembers.length === 0);

  const planLimit = maxBoardMembers ?? subscription?.plan_limits?.max_board_members ?? null;
  const ownerIncluded = lockedUserId != null ? 1 : 0;
  const totalMembers = value.length + ownerIncluded;
  const atLimit = planLimit !== null && value.length >= planLimit;

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

  const handleLookup = () => {
    const email = emailSearch.trim();
    if (!email) return;
    setLookupResult(null);
    setLookupError(null);
    lookupMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          const result = data;
          if (!result?.user) {
            setLookupError('No account found for this email. They must have a Custosell account to be added.');
          } else if (result.status === 'already_member' || result.status === 'unattached') {
            setLookupResult(result.user);
          } else if (result.status === 'other_business') {
            setLookupResult(result.user);
          } else if (result.status === 'platform_inactive') {
            setLookupError('This account is inactive and cannot be added.');
          } else {
            setLookupError('No account found for this email. They must have a Custosell account to be added.');
          }
        },
        onError: () => {
          setLookupError('Could not look up this email. Please try again.');
        },
      },
    );
  };

  const handleAddLookedUp = () => {
    if (!lookupResult || !canManage || atLimit) return;
    onChange([...value, { user_id: lookupResult.id, role: selectedRole, name: lookupResult.name, send_notification: sendNotification }]);
    setLookupResult(null);
    setEmailSearch('');
    setSelectedRole('contributor');
    setSendNotification(true);
  };

  const handleAdd = () => {
    if (!selectedUserId || !canManage || atLimit) return;
    const person = teamMembers.find((u) => u.id === selectedUserId);
    onChange([...value, { user_id: Number(selectedUserId), role: selectedRole, name: person?.name, send_notification: sendNotification }]);
    setSelectedUserId('');
    setSelectedRole('contributor');
    setSendNotification(true);
  };

  const roleMeta = (role: string) => {
    const normalized = normalizeBoardMemberRole(role);
    return ROLE_OPTIONS.find((r) => r.value === normalized) ?? ROLE_OPTIONS[0];
  };

  if (staffLoading) {
    return (
      <div className={cn('flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 py-10 text-sm text-blue-700', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
        Loading organisation staff…
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
      {planLimit !== null && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <span className="text-xs font-medium text-gray-700">Members</span>
          <span className={cn('text-xs font-semibold', atLimit ? 'text-amber-600' : 'text-gray-900')}>
            {totalMembers} / {planLimit}
            {atLimit && ' (plan limit reached)'}
          </span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Search staff from your organisation or invite any Custosell user by email.
      </p>

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
        <div className="flex items-center gap-2 self-end pb-1">
          <input
            id="send-notification"
            type="checkbox"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="send-notification" className="whitespace-nowrap text-xs text-gray-600">
            Notify via email
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!selectedUserId || atLimit}
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

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Or invite someone by email</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <input
              type="email"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
              placeholder="Enter their email address…"
              className={pickerInputClass}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleLookup}
            disabled={!emailSearch.trim() || lookupMutation.isPending}
            className="inline-flex items-center gap-2"
          >
            {lookupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {lookupMutation.isPending && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking up user…
          </div>
        )}

        {lookupError && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {lookupResult && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserIdentityChip
                name={lookupResult.name}
                size="sm"
                nameClassName="text-sm font-medium text-gray-900"
              />
              <span className="text-xs text-gray-500 truncate">{lookupResult.email}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddLookedUp}
              disabled={atLimit}
              className="inline-flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add to board
            </Button>
          </div>
        )}
      </div>

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
                      onClick={() => void handleRemove(member.user_id, displayName)}
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

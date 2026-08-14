import { useMemo } from 'react';
import { useUpdatePipelineBoard } from '../api/usePipelineQueries';
import { membersFromBoard } from '../api/pipelineBoardMembers';
import {
  BOARD_ROLE_BADGE_CLASS,
  BOARD_ROLE_LABELS,
  normalizeBoardMemberRole,
  type BoardMemberRole,
} from '../api/boardRoleUtils';
import type { BoardMemberInput, PipelineBoard } from '../api/pipelineTypes';
import type { BoardWorkspace } from './boardVisibilityOptions';
import BoardMemberPicker from './BoardMemberPicker';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { Crown, Info, Users } from 'lucide-react';

const VISIBILITY_LABELS: Record<string, string> = {
  team: 'Team',
  private: 'Private',
  shared: 'Shared',
};

interface BoardMemberCardProps {
  name: string;
  email?: string | null;
  avatar?: string | null;
  roleLabel: string;
  roleBadgeClass: string;
  isOwner: boolean;
  isYou: boolean;
}function BoardMemberCard({ name, email, avatar, roleLabel, roleBadgeClass, isOwner, isYou }: BoardMemberCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-200">
      <div className="relative shrink-0">
        <UserAvatar name={name} avatar={avatar} size="md" />
        {isOwner && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white">
            <Crown className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          {isYou && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              You
            </span>
          )}
        </div>
        {email && <p className="truncate text-xs text-gray-500">{email}</p>}
      </div>
      <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', roleBadgeClass)}>{roleLabel}</span>
    </div>
  );
}

interface BoardMembersViewProps {
  board?: PipelineBoard | null;
  boardId: number;
  workspace: BoardWorkspace;
  canManage: boolean;
}

export default function BoardMembersView({ board, boardId, workspace, canManage }: BoardMembersViewProps) {
  const user = useAppSelector((s) => s.auth.user);
  const updateBoard = useUpdatePipelineBoard();
  const visibility = board?.visibility ?? 'shared';
  const isShared = visibility === 'shared';

  const roster = useMemo(() => {
    const members = board?.members ?? [];
    const ownerId = Number(board?.created_by ?? 0);
    const ownerEntry = board?.creator
      ? {
          key: `owner-${ownerId}`,
          user_id: ownerId,
          name: board.creator.name ?? `Team member #${ownerId}`,
          email: undefined as string | undefined,
          avatar: board.creator.avatar ?? null,
          role: 'manager' as BoardMemberRole,
          isOwner: true,
        }
      : ownerId > 0
        ? { key: `owner-${ownerId}`, user_id: ownerId, name: `Team member #${ownerId}`, email: undefined as string | undefined, avatar: null, role: 'manager' as BoardMemberRole, isOwner: true }
        : null;

    const invited = members
      .filter((m) => m.user_id !== ownerId)
      .map((m) => ({
        key: `m-${m.user_id}`,
        user_id: m.user_id,
        name: m.user?.name ?? `Team member #${m.user_id}`,
        email: m.user?.email ?? undefined,
        avatar: m.user?.avatar ?? null,
        role: normalizeBoardMemberRole(m.role),
        isOwner: false,
      }));

    return [ownerEntry, ...invited].filter((entry): entry is NonNullable<typeof ownerEntry> => entry != null);
  }, [board]);

  const invitedInputs = useMemo(
    () => membersFromBoard(board?.members),
    [board],
  );

  const handleMembersChange = (next: BoardMemberInput[]) => {
    updateBoard.mutate({
      id: boardId,
      members: next.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        send_notification: m.send_notification,
      })),
      silent: true,
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Board members</h2>
              <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {roster.length} member{roster.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {isShared
                ? 'Invited collaborators can view and contribute to this board based on their role.'
                : `This board is ${VISIBILITY_LABELS[visibility] ?? visibility}. Invited members only apply to shared boards - change visibility from Board settings to invite people.`}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {roster.map((entry) => (
              <BoardMemberCard
                key={entry.key}
                name={entry.name}
                email={entry.email}
                avatar={entry.avatar}
                roleLabel={entry.isOwner ? 'Owner' : BOARD_ROLE_LABELS[entry.role]}
                roleBadgeClass={entry.isOwner ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : BOARD_ROLE_BADGE_CLASS[entry.role]}
                isOwner={entry.isOwner}
                isYou={user != null && entry.user_id === user.id}
              />
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          {!board ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
              Loading members…
            </p>
          ) : isShared ? (
            canManage ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <Users className="h-3.5 w-3.5" />
                  Manage members
                </p>
                <BoardMemberPicker
                  workspace={workspace}
                  value={invitedInputs}
                  onChange={handleMembersChange}
                  lockedUserId={board.created_by}
                  canManage
                  loadTeamMembers
                />
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                You can view the member roster. Only board owners and managers can invite members or change roles.
              </p>
            )
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              {visibility === 'team'
                ? 'This board is visible to everyone with pipeline or projects access in our organisation. To control individual access, switch it to Shared from Board settings.'
                : 'This board is private to its owner. Switch it to Shared from Board settings to invite members.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

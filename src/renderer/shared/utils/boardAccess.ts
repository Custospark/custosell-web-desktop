import type { AuthUser } from '../../app/store/slices/authSlice';
import { normalizeBoardMemberRole, type BoardMemberRole } from '../../modules/pipeline/api/boardRoleUtils';
import { canViewFullEstimates, isBusinessOwner } from './moduleAccess';

/** Staff with module access for team-visibility board listings (not shared-board invites). */
export function staffHasWorkspaceBoardAccess(
  modules: string[] | undefined,
  workspace: 'pipeline' | 'estimates',
): boolean {
  if (workspace === 'estimates') {
    return true;
  }
  return (modules ?? []).includes('pipeline');
}

/** Invite or change roles on a project team (owner, full estimates access, project creator, or project manager). */
export function canManageProjectTeam(
  user: AuthUser | null | undefined,
  members: { user_id: number; role: string }[],
  projectCreatedBy?: number,
): boolean {
  if (!user) return false;
  if (isBusinessOwner(user)) return true;
  if (canViewFullEstimates(user)) return true;
  if (projectCreatedBy && user.id === projectCreatedBy) return true;
  return members.some((m) => m.user_id === user.id && m.role === 'manager');
}

export type BoardAccessBoard = {
  can_manage_settings?: boolean;
  can_contribute?: boolean;
  current_member_role?: BoardMemberRole | null;
  created_by?: number | null;
  project_id?: number | null;
  visibility?: string;
  members?: { user_id: number; role: string }[];
};

export type BoardAccessOptions = {
  projectCreatedBy?: number | null;
  projectMembers?: { user_id: number; role: string }[];
};

/** Board settings (visibility, team, appearance) — owners and managers only. */
export function canManageBoardSettings(
  user: AuthUser | null | undefined,
  board: BoardAccessBoard,
  options?: BoardAccessOptions,
): boolean {
  if (!user) return false;
  if (typeof board.can_manage_settings === 'boolean') return board.can_manage_settings;

  if (board.visibility === 'private') {
    return Number(board.created_by) === user.id;
  }

  if (isBusinessOwner(user)) return true;

  const projectCreatedBy = options?.projectCreatedBy ?? null;
  const ownerId = board.project_id ? (projectCreatedBy ?? board.created_by) : board.created_by;

  if (ownerId && user.id === ownerId) return true;

  if (board.project_id && options?.projectMembers) {
    return canManageProjectTeam(user, options.projectMembers, projectCreatedBy ?? undefined);
  }

  if (board.visibility === 'shared' && board.members?.length) {
    const member = board.members.find((m) => m.user_id === user.id);
    if (member && normalizeBoardMemberRole(member.role) === 'manager') return true;
  }

  return false;
}

/** Invited role on a shared board, or null when visibility is not shared / user is not listed. */
export function getSharedBoardMemberRole(
  user: AuthUser | null | undefined,
  board: BoardAccessBoard,
): BoardMemberRole | null {
  if (!user || board.visibility !== 'shared') return null;
  if (board.current_member_role != null) return board.current_member_role;
  if (Number(board.created_by) === user.id) return 'manager';
  const member = board.members?.find((m) => m.user_id === user.id);
  return member ? normalizeBoardMemberRole(member.role) : null;
}

/** True when the user is an invited viewer on a shared board (read-only). */
export function isBoardViewer(
  user: AuthUser | null | undefined,
  board: BoardAccessBoard,
): boolean {
  if (!user || board.visibility !== 'shared') return false;
  if (board.current_member_role === 'viewer') return true;
  return getSharedBoardMemberRole(user, board) === 'viewer';
}

/** Move cards, columns, comment, and add resources — contributors and managers. */
export function canContributeToBoard(
  user: AuthUser | null | undefined,
  board: BoardAccessBoard,
  options?: BoardAccessOptions,
): boolean {
  if (!user) return false;
  if (isBoardViewer(user, board)) return false;
  if (typeof board.can_contribute === 'boolean') return board.can_contribute;
  if (canManageBoardSettings(user, board, options)) return true;

  if (board.project_id && options?.projectMembers) {
    const member = options.projectMembers.find((m) => m.user_id === user.id);
    const role = member?.role;
    return role === 'contributor' || role === 'manager';
  }

  if (Number(board.created_by) === user.id) return true;
  if (board.visibility === 'team') return true;

  if (board.visibility === 'shared' && board.members?.length) {
    const member = board.members.find((m) => m.user_id === user.id);
    const role = normalizeBoardMemberRole(member?.role);
    return role === 'contributor' || role === 'manager';
  }

  return false;
}

/** Comment author or board manager/owner may delete user comments (never contributors moderating others). */
export function canDeletePipelineComment(
  user: AuthUser | null | undefined,
  activity: {
    user_id?: number | null;
    user?: { id: number } | null;
    can_delete?: boolean;
  },
  board: BoardAccessBoard,
  options?: BoardAccessOptions,
): boolean {
  if (!user) return false;

  const authorId = Number(activity.user_id ?? activity.user?.id ?? 0);
  const isAuthor = authorId > 0 && authorId === Number(user.id);
  if (isAuthor) return true;

  if (board.visibility === 'shared') {
    const role = getSharedBoardMemberRole(user, board);
    if (role === 'viewer' || role === 'contributor') return false;
  }

  const isManager = canManageBoardSettings(user, board, options);
  if (!isManager) return false;

  if (typeof activity.can_delete === 'boolean') return activity.can_delete;
  return true;
}

/** Only the comment author may edit their comment. */
export function canEditPipelineComment(
  user: AuthUser | null | undefined,
  activity: {
    user_id?: number | null;
    user?: { id: number } | null;
    can_edit?: boolean;
  },
): boolean {
  if (!user) return false;
  if (typeof activity.can_edit === 'boolean') return activity.can_edit;
  const authorId = activity.user_id ?? activity.user?.id;
  return Boolean(authorId && authorId === user.id);
}

/** Board conversation: author or board manager/owner may delete (never collaborators moderating others). */
export function canDeleteBoardConversationMessage(
  user: AuthUser | null | undefined,
  message: {
    user_id?: number | null;
    user?: { id: number } | null;
    can_delete?: boolean;
    is_system?: boolean;
  },
  board: BoardAccessBoard,
  options?: BoardAccessOptions,
): boolean {
  if (!user) return false;
  if (message.is_system) return false;

  if (typeof message.can_delete === 'boolean') return message.can_delete;
  return canDeletePipelineComment(user, message, board, options);
}

/** Board conversation edit: never for automation posts; otherwise author only. */
export function canEditBoardConversationMessage(
  user: AuthUser | null | undefined,
  message: {
    user_id?: number | null;
    user?: { id: number } | null;
    can_edit?: boolean;
    is_system?: boolean;
  },
): boolean {
  if (!user) return false;
  if (message.is_system) return false;
  return canEditPipelineComment(user, message);
}

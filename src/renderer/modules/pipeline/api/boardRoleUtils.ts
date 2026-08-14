export type BoardMemberRole = 'viewer' | 'contributor' | 'manager';

/** Legacy API value `editor` - no longer stored; treat as viewer for permissions. */
export function normalizeBoardMemberRole(role: string | undefined | null): BoardMemberRole {
  if (role === 'contributor' || role === 'manager') return role;
  if (role === 'editor') return 'contributor';
  return 'viewer';
}

export const BOARD_ROLE_LABELS: Record<BoardMemberRole, string> = {
  viewer: 'Viewer',
  contributor: 'Contributor',
  manager: 'Manager',
};

export const BOARD_ROLE_HINTS: Record<BoardMemberRole, string> = {
  viewer: 'View board and cards only',
  contributor: 'Move cards and columns, comment, and add resources',
  manager: 'Board settings, team invites, archive, and delete',
};

export const BOARD_ROLE_BADGE_CLASS: Record<BoardMemberRole, string> = {
  viewer: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  contributor: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  manager: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
};

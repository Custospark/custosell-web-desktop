import type { AuthUser } from '../../app/store/slices/authSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { normalizeBoardMemberRole, type BoardMemberRole } from '../../modules/pipeline/api/boardRoleUtils';

export const ESTIMATES_FULL_MODULE = 'estimates_full';

export const BUSINESS_MODULE_SLUGS = [
  'dashboard',
  'sales',
  'inventory',
  'customers',
  'pipeline',
  'estimates',
  'expenses',
  'accounting',
  'settings',
] as const;

export type BusinessModuleSlug = (typeof BUSINESS_MODULE_SLUGS)[number];

export const MODULE_LABELS: Record<BusinessModuleSlug, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  inventory: 'Inventory',
  customers: 'Customers',
  pipeline: 'Pipeline',
  estimates: 'Projects & Estimates',
  expenses: 'Expenses',
  accounting: 'Accounting',
  settings: 'Settings',
};

export const MODULE_DEFAULT_ROUTES: Record<string, string> = {
  dashboard: ROUTES.DASHBOARD,
  sales: ROUTES.SALES.NEW,
  inventory: ROUTES.INVENTORY.PRODUCTS,
  customers: ROUTES.CUSTOMERS.INDEX,
  pipeline: ROUTES.PIPELINE.BOARDS,
  estimates: ROUTES.ESTIMATES.INDEX,
  expenses: ROUTES.EXPENSES.LIST,
  accounting: ROUTES.ACCOUNTING.RATIOS,
  settings: ROUTES.SETTINGS.BUSINESS,
  account: ROUTES.ACCOUNT.NOTIFICATIONS,
  guide: ROUTES.GUIDE.TUTORIALS,
};

const OWNER_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'dashboard', 'sales', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'settings',
];

const STAFF_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'sales', 'dashboard', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'settings',
];

/** Nav group label → module slug for business-scoped sidebar groups. */
export const NAV_GROUP_MODULE: Record<string, BusinessModuleSlug | 'account' | 'guide' | 'platform' | 'guide_settings'> = {
  Dashboard: 'dashboard',
  Sales: 'sales',
  Inventory: 'inventory',
  Customers: 'customers',
  Pipeline: 'pipeline',
  'Projects & Estimates': 'estimates',
  Estimates: 'estimates',
  Expenses: 'expenses',
  Accounting: 'accounting',
  Settings: 'settings',
  Account: 'account',
  'Custosell Guide': 'guide',
  Platform: 'platform',
  'Guide Settings': 'guide_settings',
};

export function isBusinessOwner(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_business_owner === true) return true;
  if (user.business && 'owner_id' in user.business && user.business.owner_id === user.id) return true;
  return false;
}

function storedBusinessModules(user: AuthUser): BusinessModuleSlug[] {
  if (!Array.isArray(user.modules)) {
    return [];
  }
  return user.modules.filter((m): m is BusinessModuleSlug =>
    (BUSINESS_MODULE_SLUGS as readonly string[]).includes(m),
  );
}

/** Modules an owner may grant to staff — mirrors owner’s enabled business modules. */
export function assignableStaffModuleSlugs(owner: AuthUser | null | undefined): BusinessModuleSlug[] {
  if (!owner || !isBusinessOwner(owner)) {
    return [...BUSINESS_MODULE_SLUGS];
  }
  return resolvedOwnerBusinessModules(owner);
}

/** Staff modules intersected with what the owner currently allows — for forms and display. */
export function intersectStaffModulesWithOwner(
  staffModules: readonly string[] | null | undefined,
  owner: AuthUser | null | undefined,
): BusinessModuleSlug[] {
  const allowed = new Set(assignableStaffModuleSlugs(owner));
  const normalized = (staffModules ?? []).filter((m): m is BusinessModuleSlug =>
    (BUSINESS_MODULE_SLUGS as readonly string[]).includes(m),
  );
  return normalized.filter((m) => allowed.has(m));
}

/** Owner sidebar/API modules — settings is always included. */
export function resolvedOwnerBusinessModules(user: AuthUser): BusinessModuleSlug[] {
  const stored = storedBusinessModules(user);
  if (stored.length === 0) {
    return [...BUSINESS_MODULE_SLUGS];
  }
  const modules = new Set<BusinessModuleSlug>(stored);
  modules.add('settings');
  return [...modules];
}

export function ownerHasLegacyFullEstimatesAccess(user: AuthUser | null | undefined): boolean {
  if (!user || !isBusinessOwner(user)) return false;
  return staffHasFullEstimatesModule(user.modules);
}

export function ownerInitialEstimatesFullAccess(user: AuthUser | null | undefined): boolean {
  return staffHasFullEstimatesModule(user?.modules);
}

export function getAccessibleModules(user: AuthUser | null | undefined): string[] {
  if (!user) return [];

  const modules = new Set<string>(['account', 'guide']);

  if (user.is_platform_admin) {
    modules.add('platform');
    modules.add('guide_settings');
  }

  if (isBusinessOwner(user)) {
    resolvedOwnerBusinessModules(user).forEach((m) => modules.add(m));
  } else if (user.business_id) {
    storedBusinessModules(user).forEach((m) => modules.add(m));
  }

  return [...modules];
}

export function canAccessModule(user: AuthUser | null | undefined, module: string): boolean {
  return getAccessibleModules(user).includes(module);
}

export function isProjectMember(user: AuthUser | null | undefined, projectId: number): boolean {
  if (!user?.project_member_ids?.length) return false;
  return user.project_member_ids.includes(projectId);
}

export function isProjectCollaboratorOnly(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (canAccessModule(user, 'estimates')) return false;
  return (user.project_member_ids?.length ?? 0) > 0;
}

/** Full Projects & Estimates workspace (estimates, projects, insights, templates, costing). */
export function canViewFullEstimates(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return staffHasFullEstimatesModule(user.modules);
}

export function staffHasFullEstimatesModule(modules: string[] | undefined): boolean {
  return (modules ?? []).includes(ESTIMATES_FULL_MODULE);
}

/** Persisted staff modules: business slugs plus optional `estimates_full` grant. */
export function buildStaffModulesPayload(
  businessModules: BusinessModuleSlug[],
  estimatesFullAccess: boolean,
): string[] {
  if (!businessModules.includes('estimates')) {
    return [...businessModules];
  }
  if (estimatesFullAccess) {
    return [...businessModules, ESTIMATES_FULL_MODULE];
  }
  return [...businessModules];
}

/** Project boards (+ member project detail) without full Estimates admin. */
export function hasEstimatesBoardsAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return canViewFullEstimates(user)
    || canAccessModule(user, 'estimates')
    || (user.project_member_ids?.length ?? 0) > 0;
}

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

/** Staff with Estimates module or invited collaborators — not business owners. */
export function isLimitedEstimatesUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return hasEstimatesBoardsAccess(user) && !canViewFullEstimates(user);
}

export function canViewProjectCosting(user: AuthUser | null | undefined): boolean {
  return canViewFullEstimates(user);
}

export function getEstimatesModuleDefaultRoute(user: AuthUser | null | undefined): string {
  if (canViewFullEstimates(user)) return ROUTES.ESTIMATES.INDEX;
  return ROUTES.ESTIMATES.BOARDS;
}

export function getEstimatesFallbackRoute(user: AuthUser | null | undefined): string {
  if (hasEstimatesBoardsAccess(user)) {
    return getEstimatesModuleDefaultRoute(user);
  }
  return getDefaultRoute(user);
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

/** Board settings (visibility, team, appearance) — owners and managers only. */
export function canManageBoardSettings(
  user: AuthUser | null | undefined,
  board: {
    can_manage_settings?: boolean;
    created_by?: number | null;
    project_id?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  },
  options?: {
    projectCreatedBy?: number | null;
    projectMembers?: { user_id: number; role: string }[];
  },
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

/** Move cards, columns, comment, and add resources — contributors and managers. */
export function canContributeToBoard(
  user: AuthUser | null | undefined,
  board: {
    can_contribute?: boolean;
    created_by?: number | null;
    project_id?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  },
  options?: {
    projectCreatedBy?: number | null;
    projectMembers?: { user_id: number; role: string }[];
  },
): boolean {
  if (!user) return false;
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

/** Invited role on a shared board, or null when visibility is not shared / user is not listed. */
export function getSharedBoardMemberRole(
  user: AuthUser | null | undefined,
  board: {
    current_member_role?: BoardMemberRole | null;
    created_by?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  },
): BoardMemberRole | null {
  if (!user || board.visibility !== 'shared') return null;
  if (board.current_member_role != null) return board.current_member_role;
  if (Number(board.created_by) === user.id) return 'manager';
  const member = board.members?.find((m) => m.user_id === user.id);
  return member ? normalizeBoardMemberRole(member.role) : null;
}

/** Comment author or board manager/owner may delete user comments (never contributors moderating others). */
export function canDeletePipelineComment(
  user: AuthUser | null | undefined,
  activity: {
    user_id?: number | null;
    user?: { id: number } | null;
    can_delete?: boolean;
  },
  board: Parameters<typeof canManageBoardSettings>[1],
  options?: Parameters<typeof canManageBoardSettings>[2],
): boolean {
  if (!user) return false;

  const authorId = Number(activity.user_id ?? activity.user?.id ?? 0);
  const isAuthor = authorId > 0 && authorId === Number(user.id);
  if (isAuthor) return true;

  // Shared collaborators (viewer/contributor) never moderate others' comments.
  if (board.visibility === 'shared') {
    const role = getSharedBoardMemberRole(user, board);
    if (role === 'viewer' || role === 'contributor') return false;
  }

  // Non-authors need true board manage rights (server flag or local manager check).
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
  board: Parameters<typeof canManageBoardSettings>[1],
  options?: Parameters<typeof canManageBoardSettings>[2],
): boolean {
  if (!user) return false;

  // Automation posts: managers only — even the triggering user cannot delete as "author".
  if (message.is_system) {
    if (typeof message.can_delete === 'boolean') return message.can_delete;
    return canManageBoardSettings(user, board, options);
  }

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

/** Estimates module, boards-only staff, or invited collaborator routes under /estimates. */
export function canAccessEstimatesArea(
  user: AuthUser | null | undefined,
  pathname: string,
  params?: { id?: string },
): boolean {
  if (!user) return false;
  if (canViewFullEstimates(user)) return true;

  if (pathname.startsWith('/estimates/boards')) {
    return hasEstimatesBoardsAccess(user);
  }

  const projectMatch = pathname.match(/^\/estimates\/projects\/(\d+)/);
  const projectId = projectMatch ? Number(projectMatch[1]) : params?.id ? Number(params.id) : null;
  if (projectId) {
    if (isProjectMember(user, projectId)) return true;
    return hasEstimatesBoardsAccess(user);
  }

  return false;
}

export function getDefaultRoute(user: AuthUser | null | undefined): string {
  if (!user) return ROUTES.LOGIN;

  const accessible = new Set(getAccessibleModules(user));
  const priority = isBusinessOwner(user) ? OWNER_LANDING_PRIORITY : STAFF_LANDING_PRIORITY;

  for (const mod of priority) {
    if (accessible.has(mod)) {
      if (mod === 'estimates') {
        return getEstimatesModuleDefaultRoute(user);
      }
      return MODULE_DEFAULT_ROUTES[mod];
    }
  }

  if ((user.project_member_ids?.length ?? 0) > 0) {
    return ROUTES.ESTIMATES.BOARDS;
  }

  if (accessible.has('account')) return MODULE_DEFAULT_ROUTES.account;
  if (accessible.has('guide')) return MODULE_DEFAULT_ROUTES.guide;

  return ROUTES.ACCOUNT.NOTIFICATIONS;
}

/** Map a pathname to the module slug guarding it (for layout-level checks). */
export function resolveModuleForPath(pathname: string): string | null {
  if (pathname.startsWith('/platform/guide')) return 'guide_settings';
  if (pathname.startsWith('/platform')) return 'platform';
  if (pathname.startsWith('/guide')) return 'guide';
  if (pathname.startsWith('/account') || pathname.startsWith('/notifications')) return 'account';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/invoices')) return 'sales';
  if (pathname.startsWith('/sales')) return 'sales';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/pipeline')) return 'pipeline';
  if (pathname.startsWith('/estimates')) return 'estimates';
  if (pathname.startsWith('/expenses')) return 'expenses';
  if (pathname.startsWith('/accounting')) return 'accounting';
  return null;
}

export function canAccessPath(user: AuthUser | null | undefined, pathname: string): boolean {
  const module = resolveModuleForPath(pathname);
  if (!module) return true;
  return canAccessModule(user, module);
}

/** Shift close PDF — sales staff (own shift) or dashboard users (any shift). */
export function canUseShiftCloseReport(user: AuthUser | null | undefined): boolean {
  return canAccessModule(user, 'sales') || canAccessModule(user, 'dashboard');
}

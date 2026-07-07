import type { AuthUser } from '../../app/store/slices/authSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';

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
  if (Array.isArray(user.modules)) {
    return user.modules.filter((m): m is BusinessModuleSlug =>
      (BUSINESS_MODULE_SLUGS as readonly string[]).includes(m),
    );
  }
  return [...BUSINESS_MODULE_SLUGS];
}

export function getAccessibleModules(user: AuthUser | null | undefined): string[] {
  if (!user) return [];

  const modules = new Set<string>(['account', 'guide']);

  if (user.is_platform_admin) {
    modules.add('platform');
    modules.add('guide_settings');
  }

  if (isBusinessOwner(user)) {
    BUSINESS_MODULE_SLUGS.forEach((m) => modules.add(m));
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
  if (canAccessModule(user, 'estimates') || isBusinessOwner(user)) return false;
  return (user.project_member_ids?.length ?? 0) > 0;
}

export function canViewProjectCosting(user: AuthUser | null | undefined): boolean {
  return isBusinessOwner(user) || canAccessModule(user, 'estimates');
}

/** Invite or change roles on a project team (full Estimates access, owner, or project manager). */
export function canManageProjectTeam(
  user: AuthUser | null | undefined,
  members: { user_id: number; role: string }[],
  projectCreatedBy?: number,
): boolean {
  if (!user) return false;
  if (canViewProjectCosting(user)) return true;
  if (projectCreatedBy && user.id === projectCreatedBy) return true;
  return members.some((m) => m.user_id === user.id && m.role === 'manager');
}

/** Estimates module or invited collaborator routes under /estimates/projects… */
export function canAccessEstimatesArea(
  user: AuthUser | null | undefined,
  pathname: string,
  params?: { id?: string },
): boolean {
  if (!user) return false;
  if (canAccessModule(user, 'estimates') || isBusinessOwner(user)) return true;

  if (pathname.startsWith('/estimates/my-projects')) {
    return (user.project_member_ids?.length ?? 0) > 0;
  }

  if (pathname.startsWith('/estimates/boards')) {
    if (canAccessModule(user, 'estimates') || isBusinessOwner(user)) return true;
    return (user.project_member_ids?.length ?? 0) > 0;
  }

  const projectMatch = pathname.match(/^\/estimates\/projects\/(\d+)/);
  const projectId = projectMatch ? Number(projectMatch[1]) : params?.id ? Number(params.id) : null;
  if (projectId) {
    return isProjectMember(user, projectId);
  }

  return false;
}

export function getDefaultRoute(user: AuthUser | null | undefined): string {
  if (!user) return ROUTES.LOGIN;

  const accessible = new Set(getAccessibleModules(user));
  const priority = isBusinessOwner(user) ? OWNER_LANDING_PRIORITY : STAFF_LANDING_PRIORITY;

  for (const mod of priority) {
    if (accessible.has(mod)) {
      return MODULE_DEFAULT_ROUTES[mod];
    }
  }

  if ((user.project_member_ids?.length ?? 0) > 0) {
    return ROUTES.ESTIMATES.MY_PROJECTS;
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

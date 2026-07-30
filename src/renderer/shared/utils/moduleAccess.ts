import type { AuthUser } from '../../app/store/slices/authSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';

export const ESTIMATES_FULL_MODULE = 'estimates_full';

export const HR_FULL_MODULE = 'hr_full';

export const BUSINESS_MODULE_SLUGS = [
  'dashboard',
  'sales',
  'inventory',
  'customers',
  'pipeline',
  'estimates',
  'expenses',
  'accounting',
  'forecasting',
  'documents',
  'hr',
  'settings',
] as const;

export type BusinessModuleSlug = (typeof BUSINESS_MODULE_SLUGS)[number];

export const MODULE_LABELS: Record<BusinessModuleSlug, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  inventory: 'Inventory & Supply Chain',
  customers: 'Customers',
  pipeline: 'Pipeline',
  estimates: 'Projects & Estimates',
  expenses: 'Expenses',
  accounting: 'Accounting',
  forecasting: 'Forecasting',
  documents: 'Documents',
  hr: 'HR & Payroll',
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
  forecasting: ROUTES.FORECASTING.OVERVIEW,
  documents: ROUTES.DOCUMENTS.INDEX,
  hr: ROUTES.HR.OVERVIEW,
  settings: ROUTES.SETTINGS.BUSINESS,
  account: ROUTES.ACCOUNT.NOTIFICATIONS,
  guide: ROUTES.GUIDE.TUTORIALS,
  discover: ROUTES.DISCOVER,
  // Personal modules
  pipeline_personal: ROUTES.PIPELINE.BOARDS,
  accounting_personal: ROUTES.ACCOUNTING.RATIOS,
  your_tools: ROUTES.YOUR_TOOLS,
};

const OWNER_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'dashboard', 'sales', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'forecasting', 'documents', 'hr', 'settings',
];

const STAFF_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'sales', 'dashboard', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'forecasting', 'documents', 'hr', 'settings',
];

/** Nav group label → module slug for business-scoped sidebar groups. */
export const NAV_GROUP_MODULE: Record<string, BusinessModuleSlug | 'account' | 'guide' | 'discover' | 'platform' | 'guide_settings'> = {
  Dashboard: 'dashboard',
  Sales: 'sales',
  Inventory: 'inventory',
  'Inventory & Supply Chain': 'inventory',
  Customers: 'customers',
  Pipeline: 'pipeline',
  'Projects & Estimates': 'estimates',
  Estimates: 'estimates',
  Expenses: 'expenses',
  Accounting: 'accounting',
  Forecasting: 'forecasting',
  Documents: 'documents',
  'HR & Payroll': 'hr',
  Settings: 'settings',
  Account: 'account',
  'Custosell Guide': 'guide',
  'Discover & My Orders': 'discover',
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
  const normalized = user.modules.filter((m): m is BusinessModuleSlug =>
    (BUSINESS_MODULE_SLUGS as readonly string[]).includes(m),
  );
  if (normalized.includes('customers') && !normalized.includes('sales')) {
    normalized.push('sales');
  }
  return normalized;
}

/** Modules an owner may grant to staff — full business catalog. */
export function assignableStaffModuleSlugs(owner: AuthUser | null | undefined): BusinessModuleSlug[] {
  void owner;
  return [...BUSINESS_MODULE_SLUGS];
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
  const filtered = normalized.filter((m) => allowed.has(m));
  if (filtered.includes('customers') && !filtered.includes('sales')) {
    filtered.push('sales');
  }
  return filtered;
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

  const modules = new Set<string>(['account', 'guide', 'discover']);

  if (user.is_platform_admin) {
    modules.add('platform');
    modules.add('guide_settings');
  }

  if (user.account_type === 'personal') {
    modules.add('your_tools');
    (user.modules ?? []).forEach((m) => modules.add(m));
  } else if (isBusinessOwner(user)) {
    resolvedOwnerBusinessModules(user).forEach((m) => modules.add(m));
  } else if (user.business_id) {
    storedBusinessModules(user).forEach((m) => modules.add(m));
  }

  return [...modules];
}

/** Intersect the user's accessible modules with their subscription plan's features.
 *  Non-module slugs (account, guide, discover, platform) and `settings` are always kept.
 *  Uses plan_features from the subscription response (always available after login). */
export function getPlanAccessibleModules(user: AuthUser | null | undefined): string[] {
  const accessible = getAccessibleModules(user);
  const features = user?.business?.subscription?.plan_features;
  if (!features) return accessible;

  return accessible.filter((mod) => {
    if (!(BUSINESS_MODULE_SLUGS as readonly string[]).includes(mod)) return true;
    if (mod === 'settings' || mod === 'your_tools') return true;
    return features[mod] === true;
  });
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

/** Full Projects & Estimates workspace (estimates, projects, insights, templates, costing).
 *  Business owners with estimates access see the full module; staff need the `estimates_full` flag. */
export function canViewFullEstimates(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isBusinessOwner(user) && canAccessModule(user, 'estimates')) return true;
  return staffHasFullEstimatesModule(user.modules);
}

export function staffHasFullEstimatesModule(modules: string[] | undefined): boolean {
  return (modules ?? []).includes(ESTIMATES_FULL_MODULE);
}

/** Full HR & Payroll workspace (people admin, departments, payroll, reports).
 *  Business owners with hr access see the full module; staff need the `hr_full` flag. */
export function canViewFullHr(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isBusinessOwner(user) && canAccessModule(user, 'hr')) return true;
  return staffHasFullHrModule(user.modules);
}

export function staffHasFullHrModule(modules: string[] | undefined): boolean {
  return (modules ?? []).includes(HR_FULL_MODULE);
}

export function ownerInitialHrFullAccess(user: AuthUser | null | undefined): boolean {
  return staffHasFullHrModule(user?.modules);
}

/** Persisted staff modules: business slugs plus optional `estimates_full` / `hr_full` grants. */
export function buildStaffModulesPayload(
  businessModules: BusinessModuleSlug[],
  estimatesFullAccess: boolean,
  hrFullAccess = false,
): string[] {
  const normalized = [...businessModules];
  if (normalized.includes('customers') && !normalized.includes('sales')) {
    normalized.push('sales');
  }

  const result: string[] = [...normalized];

  if (normalized.includes('estimates') && estimatesFullAccess) {
    result.push(ESTIMATES_FULL_MODULE);
  }

  if (normalized.includes('hr') && hrFullAccess) {
    result.push(HR_FULL_MODULE);
  }

  return result;
}

/** Project boards (+ member project detail) without full Estimates admin. */
export function hasEstimatesBoardsAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return canViewFullEstimates(user)
    || canAccessModule(user, 'estimates')
    || (user.project_member_ids?.length ?? 0) > 0;
}

/** Staff with Estimates module or invited collaborators — not business owners. */
export function isLimitedEstimatesUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return hasEstimatesBoardsAccess(user) && !canViewFullEstimates(user);
}

/** Users with base `hr` but not `hr_full` — sidebar and routes stay self-service only. */
export function isLimitedHrUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return canAccessModule(user, 'hr') && !canViewFullHr(user);
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

export function getHrModuleDefaultRoute(user: AuthUser | null | undefined): string {
  if (canViewFullHr(user)) return ROUTES.HR.OVERVIEW;
  return ROUTES.HR.ATTENDANCE;
}

export function getHrFallbackRoute(user: AuthUser | null | undefined): string {
  if (canAccessModule(user, 'hr')) {
    return getHrModuleDefaultRoute(user);
  }
  return getDefaultRoute(user);
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

/** HR routes: full workspace vs limited self-service (attendance, leave, talent). */
export function canAccessHrArea(
  user: AuthUser | null | undefined,
  pathname: string,
): boolean {
  if (!user || !canAccessModule(user, 'hr')) return false;
  if (canViewFullHr(user)) return true;

  if (pathname === '/hr' || pathname === '/hr/') return true;

  return (
    pathname.startsWith('/hr/attendance')
    || pathname.startsWith('/hr/leave')
    || pathname.startsWith('/hr/talent')
  );
}

export function getDefaultRoute(user: AuthUser | null | undefined): string {
  if (!user) return ROUTES.LOGIN;

  const accessible = new Set(getPlanAccessibleModules(user));

  // Personal accounts: land on Your Tools (shows active tools + tool store access)
  if (user.account_type === 'personal') {
    return ROUTES.YOUR_TOOLS;
  }

  const priority = isBusinessOwner(user) ? OWNER_LANDING_PRIORITY : STAFF_LANDING_PRIORITY;

  for (const mod of priority) {
    if (accessible.has(mod)) {
      if (mod === 'estimates') {
        return getEstimatesModuleDefaultRoute(user);
      }
      if (mod === 'hr') {
        return getHrModuleDefaultRoute(user);
      }
      return MODULE_DEFAULT_ROUTES[mod];
    }
  }

  if ((user.project_member_ids?.length ?? 0) > 0) {
    return ROUTES.ESTIMATES.BOARDS;
  }

  // Storefront shoppers (no business) — Discover, not empty POS shell
  if (!user.business_id && accessible.has('discover')) {
    return ROUTES.DISCOVER_MY_ORDERS;
  }

  if (accessible.has('account')) return MODULE_DEFAULT_ROUTES.account;
  if (accessible.has('guide')) return MODULE_DEFAULT_ROUTES.guide;

  // If business has an unpaid onboarding fee, redirect to payment
  const subscription = user?.business?.subscription;
  if (subscription && subscription.onboarding_fee_paid === false) {
    return ROUTES.REGISTER_PAYMENT;
  }

  if (subscription && ['expired', 'suspended', 'cancelled'].includes(subscription.status as string)) {
    return ROUTES.SETTINGS.SUBSCRIPTION;
  }

  return ROUTES.ACCOUNT.NOTIFICATIONS;
}

/** Map a pathname to the module slug guarding it (for layout-level checks). */
export function resolveModuleForPath(pathname: string): string | null {
  if (pathname.startsWith('/platform/guide')) return 'guide_settings';
  if (pathname.startsWith('/platform')) return 'platform';
  if (pathname.startsWith('/guide')) return 'guide';
  if (pathname.startsWith('/account') || pathname.startsWith('/notifications')) return 'account';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/your-tools')) return 'your_tools';
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
  if (pathname.startsWith('/forecasting')) return 'forecasting';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/hr')) return 'hr';
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

// Board / pipeline permission helpers live in boardAccess.ts (keeps this file ≤500 lines).
export {
  staffHasWorkspaceBoardAccess,
  canManageProjectTeam,
  canManageBoardSettings,
  isBoardViewer,
  canContributeToBoard,
  getSharedBoardMemberRole,
  canDeletePipelineComment,
  canEditPipelineComment,
  canDeleteBoardConversationMessage,
  canEditBoardConversationMessage,
} from './boardAccess';

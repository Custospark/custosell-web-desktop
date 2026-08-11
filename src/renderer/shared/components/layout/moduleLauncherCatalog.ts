import type { ElementType } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Kanban,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  LineChart,
  Files,
  IdCard,
  Settings,
  CircleUser,
  GraduationCap,
  Shield,
} from 'lucide-react';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  BUSINESS_MODULE_SLUGS,
  MODULE_LABELS,
  canAccessModule,
  getAccessibleModules,
  getEstimatesModuleDefaultRoute,
  getHrModuleDefaultRoute,
  hasEstimatesBoardsAccess,
  type BusinessModuleSlug,
} from '../../utils/moduleAccess';

export type LauncherModuleSlug =
  | BusinessModuleSlug
  | 'account'
  | 'guide'
  | 'platform'
  | 'guide_settings';

export interface ModuleLauncherItem {
  slug: LauncherModuleSlug;
  label: string;
  description: string;
  icon: ElementType;
  tone: string;
  section: 'workspace' | 'platform';
  getRoute: (user: AuthUser | null | undefined) => string;
}

const TONE = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  cyan: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
} as const;

/** Full catalog — visibility is filtered per user at runtime. */
export const MODULE_LAUNCHER_CATALOG: ModuleLauncherItem[] = [
  {
    slug: 'dashboard',
    label: MODULE_LABELS.dashboard,
    description: 'Business overview',
    icon: LayoutDashboard,
    tone: TONE.blue,
    section: 'workspace',
    getRoute: () => ROUTES.DASHBOARD,
  },
  {
    slug: 'sales',
    label: MODULE_LABELS.sales,
    description: 'POS, history, invoices',
    icon: ShoppingCart,
    tone: TONE.emerald,
    section: 'workspace',
    getRoute: () => ROUTES.SALES.NEW,
  },
  {
    slug: 'inventory',
    label: MODULE_LABELS.inventory,
    description: 'Products and stock',
    icon: Package,
    tone: TONE.amber,
    section: 'workspace',
    getRoute: () => ROUTES.INVENTORY.OVERVIEW,
  },
  {
    slug: 'customers',
    label: MODULE_LABELS.customers,
    description: 'Customer list',
    icon: Users,
    tone: TONE.sky,
    section: 'workspace',
    getRoute: () => ROUTES.CUSTOMERS.INDEX,
  },
  {
    slug: 'pipeline',
    label: MODULE_LABELS.pipeline,
    description: 'Boards and leads',
    icon: Kanban,
    tone: TONE.indigo,
    section: 'workspace',
    getRoute: () => ROUTES.PIPELINE.BOARDS,
  },
  {
    slug: 'estimates',
    label: MODULE_LABELS.estimates,
    description: 'Projects and estimates',
    icon: FileSpreadsheet,
    tone: TONE.violet,
    section: 'workspace',
    getRoute: (user) => getEstimatesModuleDefaultRoute(user),
  },
  {
    slug: 'expenses',
    label: MODULE_LABELS.expenses,
    description: 'Income tracking, expense tracking & financial overview',
    icon: Receipt,
    tone: TONE.orange,
    section: 'workspace',
    getRoute: () => ROUTES.EXPENSES.OVERVIEW,
  },
  {
    slug: 'accounting',
    label: MODULE_LABELS.accounting,
    description: 'Books and statements',
    icon: BookOpen,
    tone: TONE.teal,
    section: 'workspace',
    getRoute: () => ROUTES.ACCOUNTING.RATIOS,
  },
  {
    slug: 'forecasting',
    label: MODULE_LABELS.forecasting,
    description: 'Cash and scenarios',
    icon: LineChart,
    tone: TONE.cyan,
    section: 'workspace',
    getRoute: () => ROUTES.FORECASTING.OVERVIEW,
  },
  {
    slug: 'documents',
    label: MODULE_LABELS.documents,
    description: 'Files & documents',
    icon: Files,
    tone: TONE.slate,
    section: 'workspace',
    getRoute: () => ROUTES.DOCUMENTS.INDEX,
  },
  {
    slug: 'hr',
    label: MODULE_LABELS.hr,
    description: 'People, payroll, overview',
    icon: IdCard,
    tone: TONE.rose,
    section: 'workspace',
    getRoute: (user) => getHrModuleDefaultRoute(user),
  },
  {
    slug: 'settings',
    label: MODULE_LABELS.settings,
    description: 'Business and staff',
    icon: Settings,
    tone: TONE.slate,
    section: 'workspace',
    getRoute: () => ROUTES.SETTINGS.BUSINESS,
  },
  {
    slug: 'account',
    label: 'Account',
    description: 'Profile and alerts',
    icon: CircleUser,
    tone: TONE.blue,
    section: 'workspace',
    getRoute: () => ROUTES.ACCOUNT.NOTIFICATIONS,
  },
  {
    slug: 'guide',
    label: 'Custosell Guide',
    description: 'Tutorials and help',
    icon: GraduationCap,
    tone: TONE.fuchsia,
    section: 'workspace',
    getRoute: () => ROUTES.GUIDE.TUTORIALS,
  },
  {
    slug: 'platform',
    label: 'Platform',
    description: 'Platform admin',
    icon: Shield,
    tone: TONE.indigo,
    section: 'platform',
    getRoute: () => ROUTES.PLATFORM.OVERVIEW,
  },
  {
    slug: 'guide_settings',
    label: 'Guide Settings',
    description: 'Tutorials and FAQs admin',
    icon: GraduationCap,
    tone: TONE.violet,
    section: 'platform',
    getRoute: () => ROUTES.PLATFORM.GUIDE.TUTORIALS,
  },
];

/**
 * Modules shown in the launcher for this user:
 * defaults (account, guide) + staff/owner form-drawer modules + platform tiles when admin.
 * Also includes Projects & Estimates for project collaborators (same as sidebar).
 * When `planModules` is provided, it filters results by the user's subscription plan features.
 */
export function getLauncherModulesForUser(
  user: AuthUser | null | undefined,
  planModules?: string[],
): ModuleLauncherItem[] {
  const baseAccessible = getAccessibleModules(user);
  const accessible = planModules ?? baseAccessible;

  const accessibleSet = new Set(accessible);
  if (hasEstimatesBoardsAccess(user)) {
    accessibleSet.add('estimates');
  }

  return MODULE_LAUNCHER_CATALOG.filter((item) => {
    if (item.slug === 'estimates') {
      return hasEstimatesBoardsAccess(user) || canAccessModule(user, 'estimates');
    }
    return accessibleSet.has(item.slug);
  });
}

/** Stable order: business catalog order, then account/guide, then platform. */
export function sortLauncherModules(items: ModuleLauncherItem[]): ModuleLauncherItem[] {
  const businessOrder = new Map(
    (BUSINESS_MODULE_SLUGS as readonly string[]).map((slug, index) => [slug, index]),
  );
  const tailOrder: Record<string, number> = {
    account: 100,
    guide: 101,
    platform: 200,
    guide_settings: 201,
  };

  return [...items].sort((a, b) => {
    const ai = businessOrder.get(a.slug) ?? tailOrder[a.slug] ?? 150;
    const bi = businessOrder.get(b.slug) ?? tailOrder[b.slug] ?? 150;
    return ai - bi;
  });
}

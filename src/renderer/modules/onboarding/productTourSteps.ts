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
  LayoutGrid,
  Wifi,
  GraduationCap,
  CircleUser,
  PanelLeft,
  Headset,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../app/store/slices/authSlice';
import {
  BUSINESS_MODULE_SLUGS,
  MODULE_LABELS,
  canAccessModule,
  isBusinessOwner,
  type BusinessModuleSlug,
} from '../../shared/utils/moduleAccess';
import { MODULE_LAUNCHER_CATALOG } from '../../shared/components/layout/moduleLauncherCatalog';

export interface ProductTourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  route?: string;
  expandGroup?: string;
  icon?: ElementType;
  tone?: string;
  when?: (user: AuthUser | null | undefined) => boolean;
}

const MODULE_TOUR_COPY: Record<BusinessModuleSlug, { title: string; body: string; route: string }> = {
  dashboard: {
    title: 'Dashboard',
    body: 'Your business overview — a quick pulse on performance.',
    route: ROUTES.DASHBOARD,
  },
  sales: {
    title: 'Sales',
    body: 'Ring sales, manage orders, history, refunds, and sales invoices.',
    route: ROUTES.SALES.NEW,
  },
  inventory: {
    title: 'Inventory & Supply',
    body: 'Products, stock, marketplace, and purchase orders live here.',
    route: ROUTES.INVENTORY.PRODUCTS,
  },
  customers: {
    title: 'Customers',
    body: 'Keep your customer list ready for sales and invoicing.',
    route: ROUTES.CUSTOMERS.INDEX,
  },
  pipeline: {
    title: 'Pipeline',
    body: 'Boards and leads to win deals and track follow-ups.',
    route: ROUTES.PIPELINE.BOARDS,
  },
  estimates: {
    title: 'Projects & Estimates',
    body: 'Estimates, projects, and delivery boards.',
    route: ROUTES.ESTIMATES.INDEX,
  },
  expenses: {
    title: 'Expenses',
    body: 'Track spending and expense categories.',
    route: ROUTES.EXPENSES.LIST,
  },
  accounting: {
    title: 'Accounting',
    body: 'Books, statements, and financial ratios.',
    route: ROUTES.ACCOUNTING.RATIOS,
  },
  forecasting: {
    title: 'Forecasting',
    body: 'Cash outlook, budgets, KPIs, and scenarios.',
    route: ROUTES.FORECASTING.OVERVIEW,
  },
  documents: {
    title: 'Documents',
    body: 'Business files organized in cabinets and folders.',
    route: ROUTES.DOCUMENTS.INDEX,
  },
  hr: {
    title: 'HR & Payroll',
    body: 'People, attendance, leave, and payroll.',
    route: ROUTES.HR.OVERVIEW,
  },
  settings: {
    title: 'Settings',
    body: 'Business profile, staff, roles, and module access.',
    route: ROUTES.SETTINGS.BUSINESS,
  },
};

function launcherMeta(slug: string): { icon: ElementType; tone: string } | null {
  const item = MODULE_LAUNCHER_CATALOG.find((m) => m.slug === slug);
  if (!item) return null;
  return { icon: item.icon, tone: item.tone };
}

const SHELL_STEPS: ProductTourStep[] = [
  {
    id: 'apps',
    target: 'navbar-apps',
    title: 'Apps launcher',
    body: 'Jump anywhere in your workspace from one place — you’re never more than a click from the tools you need.',
    icon: LayoutGrid,
    tone: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  },
  {
    id: 'network',
    target: 'navbar-network',
    title: 'Stay connected',
    body: 'See online, slow, or offline instantly. Core selling and stock keep working when the network drops.',
    icon: Wifi,
    tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
  {
    id: 'guide',
    target: 'navbar-guide',
    title: 'Guide & tour',
    body: 'Tutorials, FAQs, and Replay Tour live here whenever you want a refresher.',
    icon: GraduationCap,
    tone: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
  {
    id: 'profile',
    target: 'navbar-profile',
    title: 'Your profile',
    body: 'Open your account menu for My Profile, shift actions, and sign out.',
    icon: CircleUser,
    tone: 'bg-blue-50 text-blue-600 ring-blue-100',
  },
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Your modules',
    body: 'Only the modules you can access appear here — your workspace, built for you.',
    icon: PanelLeft,
    tone: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
];

const CLOSING_STEPS: ProductTourStep[] = [
  {
    id: 'support',
    target: 'sidebar-support',
    title: 'Quick Support',
    body: 'Need help? Email or call from here anytime — we’re with you.',
    icon: Headset,
    tone: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  },
  {
    id: 'modules-owner',
    target: 'sidebar-settings-modules',
    title: 'Module access',
    body: 'Owners turn modules on for the team here. Intent never changes permissions for you.',
    route: ROUTES.SETTINGS.MODULES,
    expandGroup: 'Settings',
    icon: Settings,
    tone: 'bg-slate-100 text-slate-600 ring-slate-200',
    when: (user) => isBusinessOwner(user) && canAccessModule(user, 'settings'),
  },
  {
    id: 'workspace',
    target: 'main-workspace',
    title: 'Welcome to Custosell',
    body: 'This is your workspace. Open any module you have access to and get started.',
    icon: Sparkles,
    tone: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100',
  },
];

const FALLBACK_ICONS: Record<BusinessModuleSlug, ElementType> = {
  dashboard: LayoutDashboard,
  sales: ShoppingCart,
  inventory: Package,
  customers: Users,
  pipeline: Kanban,
  estimates: FileSpreadsheet,
  expenses: Receipt,
  accounting: BookOpen,
  forecasting: LineChart,
  documents: Files,
  hr: IdCard,
  settings: Settings,
};

function moduleStepsForUser(user: AuthUser | null | undefined): ProductTourStep[] {
  const steps: ProductTourStep[] = [];
  for (const slug of BUSINESS_MODULE_SLUGS) {
    if (!canAccessModule(user, slug)) continue;
    // Skip if the sidebar target is not rendered (group filtered out)
    const copy = MODULE_TOUR_COPY[slug];
    const label = MODULE_LABELS[slug];
    const meta = launcherMeta(slug);
    steps.push({
      id: `module-${slug}`,
      target: `sidebar-module-${slug}`,
      title: copy.title,
      body: copy.body,
      route: copy.route,
      expandGroup: label,
      icon: meta?.icon ?? FALLBACK_ICONS[slug],
      tone: meta?.tone ?? 'bg-slate-100 text-slate-600 ring-slate-200',
    });
  }
  return steps;
}

/** Prefer steps whose DOM target exists (improves precision after layout settles). */
export function filterStepsWithTargets(steps: ProductTourStep[]): ProductTourStep[] {
  if (typeof document === 'undefined') return steps;
  return steps.filter((step) => document.querySelector(`[data-tour="${step.target}"]`));
}

/** Tour steps filtered to shell + modules the user can open. */
export function resolveTourSteps(user: AuthUser | null | undefined): ProductTourStep[] {
  const shell = SHELL_STEPS.filter((step) => !step.when || step.when(user));
  const modules = moduleStepsForUser(user);
  const closing = CLOSING_STEPS.filter((step) => !step.when || step.when(user));
  return [...shell, ...modules, ...closing];
}

import { ROUTES } from '../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../app/store/slices/authSlice';
import {
  BUSINESS_MODULE_SLUGS,
  MODULE_LABELS,
  canAccessModule,
  isBusinessOwner,
  type BusinessModuleSlug,
} from '../../shared/utils/moduleAccess';

export interface ProductTourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  route?: string;
  /** Expand sidebar group before measuring (group label). */
  expandGroup?: string;
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

const SHELL_STEPS: ProductTourStep[] = [
  {
    id: 'apps',
    target: 'navbar-apps',
    title: 'Apps launcher',
    body: 'Jump anywhere in your workspace from one place — you’re never more than a click from the tools you need.',
  },
  {
    id: 'network',
    target: 'navbar-network',
    title: 'Stay connected',
    body: 'See online, slow, or offline instantly. Core selling and stock keep working when the network drops.',
  },
  {
    id: 'guide',
    target: 'navbar-guide',
    title: 'Guide & tour',
    body: 'Tutorials, FAQs, and Replay Tour live here whenever you want a refresher.',
  },
  {
    id: 'profile',
    target: 'navbar-profile',
    title: 'Your profile',
    body: 'Open your account menu for My Profile, shift actions, and sign out.',
  },
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Your modules',
    body: 'Only the modules you can access appear here — your workspace, built for you.',
  },
];

const CLOSING_STEPS: ProductTourStep[] = [
  {
    id: 'support',
    target: 'sidebar-support',
    title: 'Quick Support',
    body: 'Need help? Email or call from here anytime — we’re with you.',
  },
  {
    id: 'modules-owner',
    target: 'sidebar-settings-modules',
    title: 'Module access',
    body: 'Owners turn modules on for the team here. Intent never changes permissions for you.',
    route: ROUTES.SETTINGS.MODULES,
    expandGroup: 'Settings',
    when: (user) => isBusinessOwner(user) && canAccessModule(user, 'settings'),
  },
  {
    id: 'workspace',
    target: 'main-workspace',
    title: 'You’re ready',
    body: 'This is your workspace. Start with any module you have access to — you’ve got this.',
  },
];

function moduleStepsForUser(user: AuthUser | null | undefined): ProductTourStep[] {
  const steps: ProductTourStep[] = [];
  for (const slug of BUSINESS_MODULE_SLUGS) {
    if (!canAccessModule(user, slug)) continue;
    const copy = MODULE_TOUR_COPY[slug];
    const label = MODULE_LABELS[slug];
    steps.push({
      id: `module-${slug}`,
      target: `sidebar-module-${slug}`,
      title: copy.title,
      body: copy.body,
      route: copy.route,
      expandGroup: label === 'Inventory' ? 'Inventory & Supply Chain' : label,
    });
  }
  return steps;
}

/** Tour steps filtered to shell + modules the user can open. */
export function resolveTourSteps(user: AuthUser | null | undefined): ProductTourStep[] {
  const shell = SHELL_STEPS.filter((step) => !step.when || step.when(user));
  const modules = moduleStepsForUser(user);
  const closing = CLOSING_STEPS.filter((step) => !step.when || step.when(user));
  return [...shell, ...modules, ...closing];
}

import { ROUTES } from '../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../app/store/slices/authSlice';
import { canAccessModule, isBusinessOwner } from '../../shared/utils/moduleAccess';

export interface ProductTourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  route?: string;
  when?: (user: AuthUser | null | undefined) => boolean;
}

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: 'apps',
    target: 'navbar-apps',
    title: 'Apps launcher',
    body: 'Jump between areas of your business from one place — Sales, Inventory, HR, and more.',
  },
  {
    id: 'network',
    target: 'navbar-network',
    title: 'Connection status',
    body: 'See online, slow, or offline at a glance. Core selling and stock work can continue when the network drops.',
  },
  {
    id: 'guide',
    target: 'navbar-guide',
    title: 'Guide',
    body: 'Tutorials, FAQs, and help live here whenever you need a hand.',
  },
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Sidebar',
    body: 'Your modules live here — only what your business has enabled for you.',
  },
  {
    id: 'sidebar-first',
    target: 'sidebar-first-group',
    title: 'Open a section',
    body: 'Expand a group to reach day-to-day screens like New Sale, Products, or People.',
  },
  {
    id: 'dashboard',
    target: 'main-workspace',
    title: 'Your workspace',
    body: 'This is where your daily work happens. Start with the modules you already have access to.',
    route: ROUTES.DASHBOARD,
    when: (user) => canAccessModule(user, 'dashboard'),
  },
  {
    id: 'modules',
    target: 'sidebar-settings-modules',
    title: 'Module access',
    body: 'Owners turn modules on or off for the team here. Intent never changes these permissions for you.',
    route: ROUTES.SETTINGS.MODULES,
    when: (user) => isBusinessOwner(user) && canAccessModule(user, 'settings'),
  },
];

export function resolveTourSteps(user: AuthUser | null | undefined): ProductTourStep[] {
  return PRODUCT_TOUR_STEPS.filter((step) => !step.when || step.when(user));
}

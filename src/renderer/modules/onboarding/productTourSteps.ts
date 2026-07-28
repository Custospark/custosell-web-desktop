import {
  Settings,
  LayoutGrid,
  Wifi,
  GraduationCap,
  CircleUser,
  PanelLeft,
  Headset,
  Sparkles,
  Menu,
  CreditCard,
  Gift,
} from 'lucide-react';
import type { AuthUser } from '../../app/store/slices/authSlice';
import { canAccessModule, isBusinessOwner } from '../../shared/utils/moduleAccess';
import { navTourStepsForUser } from './productTourNavSteps';
import type { ProductTourStep } from './productTourTypes';

export type { ProductTourStep } from './productTourTypes';

const SHELL_STEPS: ProductTourStep[] = [
  {
    id: 'hamburger',
    target: 'sidebar-hamburger',
    title: 'Sidebar menu',
    body: 'Toggle the sidebar open or closed — keeps your workspace uncluttered when you need more room.',
    icon: Menu,
    tone: 'bg-slate-50 text-slate-600 ring-slate-200',
  },
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
    id: 'referral',
    target: 'navbar-referral',
    title: 'Refer & Earn',
    body: 'Share your referral code, invite businesses, and earn rewards — all from this dropdown.',
    icon: Gift,
    tone: 'bg-rose-50 text-rose-600 ring-rose-100',
  },
  {
    id: 'subscription',
    target: 'navbar-subscription',
    title: 'Your plan',
    body: 'See your current plan, compare options, and manage billing right from the navbar.',
    icon: CreditCard,
    tone: 'bg-sky-50 text-sky-600 ring-sky-100',
    when: (user) => isBusinessOwner(user),
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
    body: 'Only the modules you can access appear here — including Account and Custosell Guide.',
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
    expandGroup: 'Settings',
    icon: Settings,
    tone: 'bg-slate-100 text-slate-600 ring-slate-200',
    when: (user, planModules) => isBusinessOwner(user) && (planModules ? planModules.includes('settings') : canAccessModule(user, 'settings')),
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

/** Prefer steps whose DOM target exists (improves precision after layout settles). */
export function filterStepsWithTargets(steps: ProductTourStep[]): ProductTourStep[] {
  if (typeof document === 'undefined') return steps;
  return steps.filter((step) => document.querySelector(`[data-tour="${step.target}"]`));
}

/**
 * Shell + one step per accessible module (Account & Guide included;
 * each module expands so sub-nav sits inside the spotlight) + closing.
 * When planAccessibleModules is provided, nav and closing steps are filtered
 * by both permission AND plan — same logic as the sidebar.
 */
export function resolveTourSteps(
  user: AuthUser | null | undefined,
  planAccessibleModules?: string[],
): ProductTourStep[] {
  const shell = SHELL_STEPS.filter((step) => !step.when || step.when(user, planAccessibleModules));
  const nav = navTourStepsForUser(user, planAccessibleModules);
  const closing = CLOSING_STEPS.filter((step) => !step.when || step.when(user, planAccessibleModules));
  return [...shell, ...nav, ...closing];
}

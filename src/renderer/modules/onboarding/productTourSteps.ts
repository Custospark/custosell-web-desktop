import {
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
import { canAccessModule, isBusinessOwner } from '../../shared/utils/moduleAccess';
import { navTourStepsForUser } from './productTourNavSteps';
import type { ProductTourStep } from './productTourTypes';

export type { ProductTourStep } from './productTourTypes';

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
    body: 'Only the modules you can access appear here — including Account and Custosell Guide. Each stop shows a section with its screens.',
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

/** Prefer steps whose DOM target exists (improves precision after layout settles). */
export function filterStepsWithTargets(steps: ProductTourStep[]): ProductTourStep[] {
  if (typeof document === 'undefined') return steps;
  return steps.filter((step) => document.querySelector(`[data-tour="${step.target}"]`));
}

/**
 * Shell + one step per accessible module (Account & Guide included;
 * each module expands so sub-nav sits inside the spotlight) + closing.
 */
export function resolveTourSteps(user: AuthUser | null | undefined): ProductTourStep[] {
  const shell = SHELL_STEPS.filter((step) => !step.when || step.when(user));
  const nav = navTourStepsForUser(user);
  const closing = CLOSING_STEPS.filter((step) => !step.when || step.when(user));
  return [...shell, ...nav, ...closing];
}

import type { ElementType } from 'react';
import { Kanban, Clock, CalendarDays, ClipboardCheck } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../app/store/slices/authSlice';
import {
  canAccessModule,
  hasEstimatesBoardsAccess,
  isBusinessOwner,
  isLimitedEstimatesUser,
  isLimitedHrUser,
  NAV_GROUP_MODULE,
  MODULE_LABELS,
  type BusinessModuleSlug,
} from '../../shared/utils/moduleAccess';
import { MODULE_LAUNCHER_CATALOG } from '../../shared/components/layout/moduleLauncherCatalog';
import {
  baseNavGroups,
  type SidebarNavGroup,
} from '../../shared/components/layout/sidebarNavGroups';
import type { ProductTourStep } from './productTourTypes';

const GROUP_INTRO: Record<string, string> = {
  dashboard: 'Your business overview — a quick pulse on performance.',
  sales: 'Ring sales, manage orders, history, refunds, and sales invoices.',
  inventory: 'Products, stock, marketplace, and purchase orders live here.',
  customers: 'Keep your customer list ready for sales and invoicing.',
  pipeline: 'Boards and leads to win deals and track follow-ups.',
  estimates: 'Estimates, projects, and delivery boards.',
  expenses: 'Track spending and expense categories.',
  accounting: 'Books, statements, and financial ratios.',
  forecasting: 'Cash outlook, budgets, KPIs, and scenarios.',
  documents: 'Business files organized in cabinets and folders.',
  hr: 'People, attendance, leave, and payroll.',
  settings: 'Business profile, staff, roles, and module access.',
  guide: 'Tutorials, FAQs, feedback, and help — learn Custosell at your pace.',
  account: 'Notifications and your profile — keep your account up to date.',
};

function launcherMeta(slug: string): { icon: ElementType; tone: string } | null {
  const item = MODULE_LAUNCHER_CATALOG.find((m) => m.slug === slug);
  if (!item) return null;
  return { icon: item.icon, tone: item.tone };
}

/** Same visibility rules as Sidebar — tour only covers what the user can open. */
export function tourNavGroupsForUser(user: AuthUser | null | undefined): SidebarNavGroup[] {
  return baseNavGroups.filter((group) => {
    const moduleSlug = NAV_GROUP_MODULE[group.label];
    if (!moduleSlug) return true;
    if (group.label === 'Projects & Estimates') {
      return hasEstimatesBoardsAccess(user);
    }
    return canAccessModule(user, moduleSlug);
  }).map((group) => {
    if (group.label === 'Projects & Estimates' && isLimitedEstimatesUser(user)) {
      return {
        ...group,
        subItems: [
          { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban },
        ],
      };
    }
    if (group.label === 'HR & Payroll' && isLimitedHrUser(user)) {
      return {
        ...group,
        subItems: [
          { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
          { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
          { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
        ],
      };
    }
    if (group.label === 'Settings') {
      return {
        ...group,
        subItems: group.subItems.filter((item) => !item.ownerOnly || isBusinessOwner(user)),
      };
    }
    return group;
  });
}

function groupTitle(group: SidebarNavGroup, slug: string): string {
  if (slug in MODULE_LABELS) return MODULE_LABELS[slug as BusinessModuleSlug];
  return group.label;
}

function groupBody(slug: string, group: SidebarNavGroup): string {
  const intro = GROUP_INTRO[slug] ?? `${group.label} — part of your Custosell workspace.`;
  if (group.subItems.length <= 1) return intro;
  const names = group.subItems.map((s) => s.label).join(', ');
  return `${intro} Includes ${names}.`;
}

/**
 * One step per accessible module (incl. Account & Custosell Guide).
 * Spotlight targets the expanded group so header + sub-nav show together.
 */
export function navTourStepsForUser(user: AuthUser | null | undefined): ProductTourStep[] {
  const steps: ProductTourStep[] = [];

  for (const group of tourNavGroupsForUser(user)) {
    const slug = NAV_GROUP_MODULE[group.label];
    if (!slug || slug === 'platform' || slug === 'guide_settings') continue;

    const meta = launcherMeta(slug);
    const isSingle = group.subItems.length === 1;

    steps.push({
      id: `module-${slug}`,
      target: `sidebar-module-${slug}`,
      title: groupTitle(group, slug),
      body: groupBody(slug, group),
      route: group.subItems[0]?.to,
      // Expand so sub-items are visible inside the group spotlight
      expandGroup: isSingle ? undefined : group.label,
      icon: meta?.icon ?? group.icon,
      tone: meta?.tone ?? 'bg-slate-100 text-slate-600 ring-slate-200',
    });
  }

  return steps;
}

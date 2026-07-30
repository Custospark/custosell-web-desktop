import {
  Kanban, Clock, CalendarDays, ClipboardCheck, Package, Settings, Download, ShoppingBag,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import {
  canAccessModule,
  hasEstimatesBoardsAccess,
  isBusinessOwner,
  isLimitedEstimatesUser,
  isLimitedHrUser,
  NAV_GROUP_MODULE,
} from '../../utils/moduleAccess';
import {
  baseNavGroups,
  guideSettingsNavGroup,
  platformNavGroup,
  type SidebarNavGroup,
  type SidebarSubItem,
} from './sidebarNavGroups';

export interface AccessibleNavLeaf extends SidebarSubItem {
  groupLabel: string;
}

/** Same group filter as Sidebar — module access, limited HR/estimates, owner-only settings.
 *  When `planAccessibleModules` is passed, it replaces `canAccessModule` for business module
 *  gating so the sidebar respects the user's subscription plan features. */
export function resolveAccessibleNavGroups(
  user: AuthUser | null | undefined,
  planAccessibleModules?: string[],
): SidebarNavGroup[] {
  const hasModule = planAccessibleModules
    ? (slug: string) => planAccessibleModules.includes(slug)
    : (slug: string) => canAccessModule(user, slug);

  const isPersonal = user?.account_type === 'personal';

  const businessGroups = baseNavGroups.filter((group) => {
    const moduleSlug = NAV_GROUP_MODULE[group.label];
    if (!moduleSlug) return true;
    if (group.label === 'Projects & Estimates') {
      if (!hasModule('estimates')) return false;
      return hasEstimatesBoardsAccess(user);
    }
    if (group.label === 'Discover & My Orders') return true;
    if (group.label === 'Custosell Guide') return true;
    if (group.label === 'Account') return true;
    return hasModule(moduleSlug);
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
      if (isPersonal) {
        return {
          ...group,
          subItems: group.subItems.filter((item) => item.label === 'Data & Export'),
        };
      }
      return {
        ...group,
        subItems: group.subItems.filter((item) => !item.ownerOnly || isBusinessOwner(user)),
      };
    }
    if (group.label === 'Documents' && isPersonal) {
      return {
        ...group,
        subItems: group.subItems.map((item) =>
          item.label === 'Business files' ? { ...item, label: 'Documents' } : item,
        ),
      };
    }
    return group;
  });

  const result = isPersonal
    ? [
        {
          icon: Package,
          label: 'Your Tools',
          subItems: [
            { to: ROUTES.YOUR_TOOLS, label: 'Tool manager', icon: Package },
          ],
        } satisfies SidebarNavGroup,
        ...businessGroups,
      ]
    : businessGroups;

  if (user?.is_platform_admin) {
    return [...result, platformNavGroup, guideSettingsNavGroup];
  }

  return result;
}

/** Flatten accessible groups in catalog order into leaf destinations. */
export function resolveAccessibleNavLeaves(
  user: AuthUser | null | undefined,
  planAccessibleModules?: string[],
): AccessibleNavLeaf[] {
  const leaves: AccessibleNavLeaf[] = [];
  for (const group of resolveAccessibleNavGroups(user, planAccessibleModules)) {
    for (const item of group.subItems) {
      leaves.push({ ...item, groupLabel: group.label });
    }
  }
  return leaves;
}

/** Active match for sidebar / mobile tab leaf routes. */
export function isSidebarSubItemActive(pathname: string, itemTo: string): boolean {
  if (pathname === itemTo) return true;
  if (itemTo === ROUTES.PIPELINE.BOARDS) {
    return /^\/pipeline\/boards\/\d+/.test(pathname);
  }
  if (itemTo === ROUTES.ESTIMATES.BOARDS) {
    return /^\/estimates\/boards\/\d+/.test(pathname) || pathname === ROUTES.ESTIMATES.BOARDS;
  }
  if (itemTo === ROUTES.ESTIMATES.PROJECTS) {
    return /^\/estimates\/projects\/\d+/.test(pathname);
  }
  if (itemTo === ROUTES.ESTIMATES.INDEX) {
    return /^\/estimates\/\d+/.test(pathname);
  }
  return pathname.startsWith(`${itemTo}/`);
}

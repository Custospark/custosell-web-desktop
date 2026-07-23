import {
  Kanban, Clock, CalendarDays, ClipboardCheck,
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

/** Same group filter as Sidebar — module access, limited HR/estimates, owner-only settings. */
export function resolveAccessibleNavGroups(user: AuthUser | null | undefined): SidebarNavGroup[] {
  const businessGroups = baseNavGroups.filter((group) => {
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
    const hasOwnerOnly = group.subItems.some((item) => item.ownerOnly);
    if (hasOwnerOnly) {
      return {
        ...group,
        subItems: group.subItems.filter((item) => !item.ownerOnly || isBusinessOwner(user)),
      };
    }
    return group;
  }).filter((group) => group.subItems.length > 0);

  if (user?.is_platform_admin) {
    return [...businessGroups, platformNavGroup, guideSettingsNavGroup];
  }

  return businessGroups;
}

/** Flatten accessible groups in catalog order into leaf destinations. */
export function resolveAccessibleNavLeaves(user: AuthUser | null | undefined): AccessibleNavLeaf[] {
  const leaves: AccessibleNavLeaf[] = [];
  for (const group of resolveAccessibleNavGroups(user)) {
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

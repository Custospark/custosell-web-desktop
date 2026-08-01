import { useMemo } from 'react';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { getPlanAccessibleModules } from '../../../utils/moduleAccess';
import { resolveAccessibleNavGroups } from '../resolveAccessibleNavLeaves';
import type { SidebarNavGroup } from '../sidebarNavGroups';
import { describeNavItem } from './searchDescriptions';
import type { SearchableNavItem } from './searchTypes';

/** One entry per sidebar module (group) — routes to the module's first page. */
function groupEntries(group: SidebarNavGroup): SearchableNavItem[] {
  const first = group.subItems[0];
  if (!first) return [];
  return [
    {
      id: `group:${group.label}`,
      label: group.label,
      description: describeNavItem(first.to, group.label, group.label),
      route: first.to,
      group: group.label,
      keywords: [group.label, ...group.subItems.map((s) => s.label)],
    },
  ];
}

/** One entry per sidebar sub item (page). */
function subItemEntries(group: SidebarNavGroup): SearchableNavItem[] {
  return group.subItems.map((sub) => ({
    id: `${group.label}:${sub.label}`,
    label: sub.label,
    description: describeNavItem(sub.to, sub.label, group.label),
    route: sub.to,
    group: group.label,
    keywords: [sub.label, group.label, ...sub.to.split('/').filter(Boolean)],
  }));
}

/** Flatten access-filtered nav groups into the searchable catalog. */
export function buildSearchIndex(groups: SidebarNavGroup[]): SearchableNavItem[] {
  const items: SearchableNavItem[] = [];
  for (const group of groups) {
    items.push(...groupEntries(group), ...subItemEntries(group));
  }
  return items;
}

/**
 * Searchable catalog mirroring the sidebar the current user can actually see.
 * The index is derived from the same access resolver the sidebar uses, so a
 * result only ever routes the user somewhere they already have access to.
 */
export function useSearchIndex(): SearchableNavItem[] {
  const user = useAppSelector((s) => s.auth.user);
  return useMemo(() => {
    const planModules = getPlanAccessibleModules(user);
    return buildSearchIndex(resolveAccessibleNavGroups(user, planModules));
  }, [user]);
}

import { useMemo } from 'react';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { getPlanAccessibleModules } from '../../../utils/moduleAccess';
import { resolveAccessibleNavGroups } from '../resolveAccessibleNavLeaves';
import type { SidebarNavGroup } from '../sidebarNavGroups';
import { describeNavItem } from './searchDescriptions';
import { keywordsForRoute, MODULE_ALIASES, MODULE_LANDING_ROUTES } from './searchKeywords';
import type { SearchableNavItem } from './searchTypes';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import { useGuideCommunities } from '../../../../modules/guide/api/GuideQueries';
import type { GuideCommunityDto } from '../../../../modules/guide/api/GuideTypes';

/** One entry per sidebar module (group) - routes to the module's landing page. */
function groupEntries(group: SidebarNavGroup): SearchableNavItem[] {
  const first = group.subItems[0];
  if (!first) return [];
  const route = MODULE_LANDING_ROUTES[group.label] ?? first.to;
  return [
    {
      id: `group:${group.label}`,
      label: group.label,
      description: describeNavItem(first.to, group.label, group.label),
      route,
      group: group.label,
      keywords: [...(MODULE_ALIASES[group.label] ?? []), group.label, ...group.subItems.map((s) => s.label)],
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
    keywords: [sub.label, group.label, ...keywordsForRoute(sub.to), ...sub.to.split('/').filter(Boolean)],
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
 * Guide surfaces (Communities, plus the live community links) are appended so
 * typing "community", "whatsapp", or a community's name surfaces them.
 */
export function useSearchIndex(): SearchableNavItem[] {
  const user = useAppSelector((s) => s.auth.user);
  const { data: communities = [] } = useGuideCommunities();
  return useMemo(() => {
    const planModules = getPlanAccessibleModules(user);
    const navItems = buildSearchIndex(resolveAccessibleNavGroups(user, planModules));

    // Company-wide communities page + each live community as a searchable term.
    const guideItems: SearchableNavItem[] = [
      {
        id: 'guide:communities',
        label: 'Communities',
        description: 'Join the Custosell community - WhatsApp, Telegram, and more.',
        route: ROUTES.GUIDE.COMMUNITIES,
        group: 'Guide',
        keywords: [
          'communities', 'community', 'join', 'whatsapp', 'telegram', 'discord', 'facebook',
          'instagram', 'youtube', 'tiktok', 'slack', 'linkedin', 'x', 'twitter',
        ],
      },
      ...communities.map((c: GuideCommunityDto) => ({
        id: `guide:community:${c.uuid}`,
        label: c.name,
        description: c.description ?? `Join the ${c.platform} community.`,
        route: ROUTES.GUIDE.COMMUNITIES,
        group: 'Guide',
        keywords: [c.name, c.platform, 'community', 'join', c.description ?? ''],
      })),
    ];

    return [...navItems, ...guideItems];
  }, [user, communities]);
}

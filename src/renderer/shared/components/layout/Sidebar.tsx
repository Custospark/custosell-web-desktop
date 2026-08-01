import { useRef, useState, useEffect, useMemo } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  ChevronDown, ChevronRight, Mail, Phone, Headset, X,
} from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { usePlanAccessibleModules } from '../../utils/usePlanAccessibleModules';
import LogoImage from '../../assets/LogoImage';
import { CustosellBrandLockup } from '../brand/CustosellBrandLockup';
import { CUSTOSELL_SUPPORT } from '../../../modules/guide/guideSupportConfig';
import { NAV_GROUP_MODULE } from '../../utils/moduleAccess';
import { SHELL_HEADER_HEIGHT_CLASS } from './layoutConstants';
import { cn } from '../../utils/cn';
import { OfflineDisabledNav } from './OfflineDisabledNav';
import { isOnlineOnlyNavTarget, onlineOnlyHoverMessage } from './onlineOnlyNav';
import {
  baseSubRoutes,
  platformSubRoutes,
  type SidebarNavGroup,
} from './sidebarNavGroups';
import {
  isSidebarSubItemActive,
  resolveAccessibleNavGroups,
} from './resolveAccessibleNavLeaves';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function getGroupIndexForPath(pathname: string, navGroups: SidebarNavGroup[], allSubRoutes: string[]): number | null {
  for (const route of allSubRoutes) {
    if (route === pathname || pathname.startsWith(route + '/') || pathname.startsWith(route + '?')) {
      for (let i = 0; i < navGroups.length; i++) {
        if (navGroups[i].subItems.some((s) => s.to === route || (route !== ROUTES.DASHBOARD && s.to.startsWith(route)))) {
          return i;
        }
      }
    }
  }
  return null;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const planModules = usePlanAccessibleModules();
  const navGroups = useMemo(() => resolveAccessibleNavGroups(user, planModules), [user, planModules]);
  const allSubRoutes = useMemo(
    () => (user?.is_platform_admin ? [...baseSubRoutes, ...platformSubRoutes] : baseSubRoutes),
    [user?.is_platform_admin],
  );
  const currentGroupIndex = getGroupIndexForPath(location.pathname, navGroups, allSubRoutes);
  const [openGroup, setOpenGroup] = useState<number | null>(currentGroupIndex);

  useEffect(() => {
    if (currentGroupIndex !== null && openGroup !== currentGroupIndex) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenGroup(currentGroupIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupIndex]);

  return <SidebarInner isOpen={isOpen} onClose={onClose} openGroup={openGroup} setOpenGroup={setOpenGroup} navGroups={navGroups} />;
}

function SidebarInner({ isOpen, onClose, openGroup, setOpenGroup, navGroups }: SidebarProps & { openGroup: number | null; setOpenGroup: (i: number | null) => void; navGroups: SidebarNavGroup[] }) {
  const { state } = useAppContext();
  const collapsed = state.sidebarCollapsed;
  const location = useLocation();
  const { isCompletelyOffline } = useNetworkStatus();
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!activeItemRef.current) return;
    activeItemRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [location.pathname, openGroup, isOpen]);

  return (
    <aside
      className={cn(
        'absolute left-0 top-0 bottom-0 z-40 lg:z-30 flex h-full flex-col',
        'border-r border-gray-200 bg-white transition-all duration-200 transform',
        collapsed ? 'w-[64px]' : 'w-[247px]',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}
    >
      <div
        className={cn(
          'shrink-0 border-b border-gray-200 flex items-center gap-2.5',
          SHELL_HEADER_HEIGHT_CLASS,
          collapsed ? 'justify-center px-2' : 'px-6',
        )}
      >
        {collapsed ? (
          <LogoImage size="sm" />
        ) : (
          <CustosellBrandLockup
            showTagline
            logoSize="sm"
            nameClassName="text-lg"
            className="flex-1"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Close sidebar"
          data-tour="sidebar-close"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto" data-tour="sidebar-nav">
        {navGroups.map((group, groupIndex) => {
          const groupOpen = openGroup === groupIndex;
          const Icon = group.icon;
          const isSingle = group.subItems.length === 1;
          const allSubsOffline = group.subItems.every((item) => isOnlineOnlyNavTarget(item.to));
          const groupOfflineBlocked = isCompletelyOffline && allSubsOffline;
          const groupOfflineTitle = groupOfflineBlocked
            ? onlineOnlyHoverMessage(group.subItems[0]?.to ?? '')
            : group.label;
          const firstGroupAttr = groupIndex === 0 ? { 'data-tour': 'sidebar-first-group' } : {};
          const moduleSlug = NAV_GROUP_MODULE[group.label];
          // Include Account + Custosell Guide; skip platform admin-only groups
          const moduleTourAttr = moduleSlug && moduleSlug !== 'platform' && moduleSlug !== 'guide_settings'
            ? { 'data-tour': `sidebar-module-${moduleSlug}` }
            : {};
          // Group wrapper gets the module anchor so expanded sub-nav is inside the spotlight
          const groupTourAttr = { ...firstGroupAttr, ...moduleTourAttr };

          if (collapsed) {
            return (
              <div key={group.label} className="space-y-1" {...groupTourAttr}>
                <div
                  className={cn(
                    'flex justify-center py-2.5',
                    groupOfflineBlocked ? 'cursor-not-allowed text-gray-300 opacity-50' : 'text-gray-400',
                  )}
                  title={groupOfflineTitle}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          }

          if (isSingle) {
            const item = group.subItems[0];
            const itemBlocked = isCompletelyOffline && isOnlineOnlyNavTarget(item.to);
            if (itemBlocked) {
              return (
                <OfflineDisabledNav
                  key={group.label}
                  title={onlineOnlyHoverMessage(item.to)}
                  className="gap-3 rounded-lg px-4 py-2.5 text-sm text-gray-500"
                  {...groupTourAttr}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{group.label}</span>
                </OfflineDisabledNav>
              );
            }
            return (
              <NavLink
                key={group.label}
                to={item.to}
                onClick={onClose}
                ref={isSidebarSubItemActive(location.pathname, item.to) ? activeItemRef : null}
                {...groupTourAttr}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{group.label}</span>
              </NavLink>
            );
          }

          const hasActiveChild = group.subItems.some((item) =>
            isSidebarSubItemActive(location.pathname, item.to),
          );

          return (
            <div key={group.label} {...groupTourAttr}>
              <button
                type="button"
                onClick={() => setOpenGroup(groupOpen ? null : groupIndex)}
                title={groupOfflineBlocked ? groupOfflineTitle : undefined}
                aria-expanded={groupOpen}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                  groupOfflineBlocked && 'cursor-not-allowed opacity-50',
                  groupOpen || hasActiveChild
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {groupOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {groupOpen && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                  {group.subItems.map((item) => {
                    const isChildActive = isSidebarSubItemActive(location.pathname, item.to);
                    const childBlocked = isCompletelyOffline && isOnlineOnlyNavTarget(item.to);
                    const modulesAttr = item.to === ROUTES.SETTINGS.MODULES
                      ? { 'data-tour': 'sidebar-settings-modules' }
                      : item.to === ROUTES.SETTINGS.SUBSCRIPTION
                        ? { 'data-tour': 'sidebar-settings-subscription' }
                        : item.to === ROUTES.ACCOUNT.REFERRALS
                          ? { 'data-tour': 'sidebar-account-referrals' }
                          : {};
                    if (childBlocked) {
                      return (
                        <OfflineDisabledNav
                          key={item.to}
                          title={onlineOnlyHoverMessage(item.to)}
                          className="gap-3 rounded-lg px-3 py-2 text-sm text-gray-400"
                          {...modulesAttr}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </OfflineDisabledNav>
                      );
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={onClose}
                        ref={isChildActive ? activeItemRef : null}
                        {...modulesAttr}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          isChildActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-gray-200/50">
        {!collapsed && (
          <div
            className="p-3 rounded-xl border bg-linear-to-br from-gray-50 to-gray-100/50 border-gray-200/50"
            data-tour="sidebar-support"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shrink-0 bg-cyan-100">
                <Headset className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Quick Support</p>
                <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 mt-0.5">
                  <a
                    href={`mailto:${CUSTOSELL_SUPPORT.email}`}
                    className="text-xs truncate hover:underline inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                  >
                    {CUSTOSELL_SUPPORT.email}
                  </a>
                  {CUSTOSELL_SUPPORT.phones.map((phone) => (
                    <a
                      key={phone.tel}
                      href={`tel:${phone.tel}`}
                      className="text-xs truncate hover:underline inline-flex items-center gap-1 text-gray-600 hover:text-gray-700"
                    >
                      {phone.display}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2" data-tour="sidebar-support">
            <a
              href={`mailto:${CUSTOSELL_SUPPORT.email}`}
              className="text-gray-400 hover:text-cyan-600 transition-colors"
              title={`Email: ${CUSTOSELL_SUPPORT.email}`}
            >
              <Mail className="w-4 h-4" />
            </a>
            <a
              href={`tel:${CUSTOSELL_SUPPORT.phones[0].tel}`}
              className="text-gray-400 hover:text-cyan-600 transition-colors"
              title={`Call: ${CUSTOSELL_SUPPORT.phones[0].display}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}

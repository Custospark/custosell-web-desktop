import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Ellipsis } from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../utils/cn';
import {
  APP_MOBILE_TAB_BAR_HEIGHT_CLASS,
} from './layoutConstants';
import {
  isSidebarSubItemActive,
  resolveAccessibleNavLeaves,
} from './resolveAccessibleNavLeaves';
import { AppMobileMoreSheet } from './AppMobileMoreSheet';
import { isOnlineOnlyNavTarget, onlineOnlyHoverMessage } from './onlineOnlyNav';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { usePlanAccessibleModules } from '../../utils/usePlanAccessibleModules';

const tabBtnBase =
  'flex h-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center transition-colors';

/**
 * Auth shell mobile bottom tabs: Menu | first two accessible leaves | More.
 * Fixed to bottom so it's always visible regardless of scroll position. `lg:hidden`.
 */
export function AppMobileTabBar() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const { isCompletelyOffline } = useNetworkStatus();

  const planModules = usePlanAccessibleModules();
  const leaves = useMemo(() => resolveAccessibleNavLeaves(user, planModules), [user, planModules]);
  const pinTabs = leaves.slice(0, 2);
  const remainingLeaves = leaves.slice(2);
  const moreActive =
    state.mobileMoreOpen
    || remainingLeaves.some((leaf) => isSidebarSubItemActive(location.pathname, leaf.to));

  const handleMenu = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const handleMore = () => {
    dispatch({ type: 'TOGGLE_MOBILE_MORE' });
  };

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          'lg:hidden',
        )}
        aria-label="Mobile primary"
      >
        <ul className={cn('grid w-full grid-cols-4 items-stretch px-1', APP_MOBILE_TAB_BAR_HEIGHT_CLASS)}>
          <li className="min-w-0">
            <button
              type="button"
              onClick={handleMenu}
              data-tour="sidebar-hamburger"
              aria-label={state.sidebarOpen ? 'Hide menu' : 'Show menu'}
              aria-pressed={state.sidebarOpen}
              className={cn(
                tabBtnBase,
                'w-full',
                state.sidebarOpen ? 'text-blue-600' : 'text-slate-600 active:text-slate-900',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center sm:rounded-xl',
                  state.sidebarOpen ? 'bg-blue-50' : 'bg-transparent',
                )}
              >
                <Menu className={cn('h-5 w-5', state.sidebarOpen && 'stroke-[2.25]')} aria-hidden />
              </span>
              <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">Menu</span>
            </button>
          </li>

          {([0, 1] as const).map((slot) => {
            const leaf = pinTabs[slot];
            if (!leaf) {
              return (
                <li key={`empty-${slot}`} className="min-w-0" aria-hidden>
                  <span className="block h-full" />
                </li>
              );
            }
            const Icon = leaf.icon;
            const blocked = isCompletelyOffline && isOnlineOnlyNavTarget(leaf.to);
            const active = isSidebarSubItemActive(location.pathname, leaf.to);
            if (blocked) {
              return (
                <li key={leaf.to} className="min-w-0">
                  <span
                    title={onlineOnlyHoverMessage(leaf.to)}
                    className={cn(tabBtnBase, 'w-full cursor-not-allowed text-slate-300')}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center sm:rounded-xl">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">
                      {leaf.label}
                    </span>
                  </span>
                </li>
              );
            }
            return (
              <li key={leaf.to} className="min-w-0">
                <NavLink
                  to={leaf.to}
                  onClick={() => {
                    if (state.sidebarOpen) dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
                    if (state.mobileMoreOpen) dispatch({ type: 'SET_MOBILE_MORE_OPEN', payload: false });
                  }}
                  className={cn(
                    tabBtnBase,
                    active ? 'text-blue-600' : 'text-slate-600 active:text-slate-900',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center sm:rounded-xl',
                      active ? 'bg-blue-50' : 'bg-transparent',
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'stroke-[2.25]')} aria-hidden />
                  </span>
                  <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">
                    {leaf.label}
                  </span>
                </NavLink>
              </li>
            );
          })}

          <li className="min-w-0">
            <button
              type="button"
              onClick={handleMore}
              aria-label="More destinations"
              aria-expanded={state.mobileMoreOpen}
              aria-pressed={moreActive}
              className={cn(
                tabBtnBase,
                'w-full',
                moreActive ? 'text-blue-600' : 'text-slate-600 active:text-slate-900',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center sm:rounded-xl',
                  moreActive ? 'bg-blue-50' : 'bg-transparent',
                )}
              >
                <Ellipsis className={cn('h-5 w-5', moreActive && 'stroke-[2.25]')} aria-hidden />
              </span>
              <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {state.mobileMoreOpen ? (
        <AppMobileMoreSheet remainingLeaves={remainingLeaves} pathname={location.pathname} />
      ) : null}
    </>
  );
}

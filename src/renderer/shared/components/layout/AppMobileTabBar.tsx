import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { House, Package, ShoppingBag, Ellipsis } from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';
import { APP_MOBILE_TAB_BAR_HEIGHT_CLASS } from './layoutConstants';
import { isSidebarSubItemActive, resolveAccessibleNavLeaves } from './resolveAccessibleNavLeaves';
import { AppMobileMoreSheet } from './AppMobileMoreSheet';

const tabBtnBase =
  'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors';

interface TabDef {
  label: string;
  to: string;
  icon: typeof House;
  match?: string;
}

export function AppMobileTabBar() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const loggedIn = Boolean(user);

  const leaves = useMemo(() => resolveAccessibleNavLeaves(user), [user]);
  const remainingLeaves = useMemo(() => leaves.slice(3), [leaves]);

  const tabs: TabDef[] = useMemo(() => [
    {
      label: loggedIn ? 'Home' : 'Home',
      to: loggedIn ? ROUTES.DASHBOARD : ROUTES.HOME,
      icon: House,
    },
    {
      label: 'Products',
      to: loggedIn ? ROUTES.INVENTORY.PRODUCTS : `${ROUTES.DISCOVER}?focus=products`,
      icon: Package,
    },
    {
      label: 'My Orders',
      to: ROUTES.DISCOVER_MY_ORDERS,
      icon: ShoppingBag,
      match: ROUTES.DISCOVER_MY_ORDERS,
    },
  ], [loggedIn]);

  const moreActive =
    state.mobileMoreOpen
    || remainingLeaves.some((leaf) => isSidebarSubItemActive(location.pathname, leaf.to));

  const handleMore = () => {
    dispatch({ type: 'TOGGLE_MOBILE_MORE' });
  };

  const isActive = (tab: TabDef) => {
    if (tab.match) return location.pathname.startsWith(tab.match);
    return location.pathname === tab.to;
  };

  return (
    <>
      <nav
        className={cn(
          'shrink-0 border-t border-slate-200 bg-white',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          'lg:hidden',
        )}
        aria-label="Mobile primary"
      >
        <ul className={cn('mx-auto grid max-w-lg grid-cols-4 items-stretch', APP_MOBILE_TAB_BAR_HEIGHT_CLASS)}>
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="min-w-0">
                <NavLink
                  to={tab.to}
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
                      'flex h-7 w-7 items-center justify-center',
                      active ? 'bg-blue-50' : 'bg-transparent',
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'stroke-[2.25]')} aria-hidden />
                  </span>
                  <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">
                    {tab.label}
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
                  'flex h-7 w-7 items-center justify-center',
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

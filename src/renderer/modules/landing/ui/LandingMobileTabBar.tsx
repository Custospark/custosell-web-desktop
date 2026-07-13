import { NavLink } from 'react-router-dom';
import { cn } from '../../../shared/utils/cn';
import { LANDING_MOBILE_TABS, scrollLandingToTop } from './landingMobileNav';

/** Fixed bottom tab bar — marketing shell, mobile only. */
export function LandingMobileTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
      aria-label="Mobile primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-1 pt-1">
        {LANDING_MOBILE_TABS.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.end}
                onClick={scrollLandingToTop}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-500 active:text-slate-800',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-12 items-center justify-center rounded-2xl transition-colors',
                        isActive ? 'bg-blue-50' : 'bg-transparent',
                      )}
                    >
                      <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} aria-hidden />
                    </span>
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

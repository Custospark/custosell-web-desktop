import { NavLink } from 'react-router-dom';
import { cn } from '../../../shared/utils/cn';
import { LANDING_MOBILE_TABS, scrollLandingToTop } from './landingMobileNav';

/** Fixed bottom tab bar — marketing shell, mobile only. Labels always visible. */
export function LandingMobileTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(15,23,42,0.1)] md:hidden"
      aria-label="Mobile primary"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4 items-stretch px-1">
        {LANDING_MOBILE_TABS.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.path} className="min-w-0">
              <NavLink
                to={link.path}
                end={link.end}
                onClick={scrollLandingToTop}
                className={({ isActive }) =>
                  cn(
                    'flex h-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-600 active:text-slate-900',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
                        isActive ? 'bg-blue-50' : 'bg-transparent',
                      )}
                    >
                      <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} aria-hidden />
                    </span>
                    <span className="w-full truncate text-[11px] font-bold leading-none tracking-wide">
                      {link.label}
                    </span>
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

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutGrid, MessageSquareText } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderQuickNav } from './HeaderQuickNav';
import { AppStoreCoachmark } from './AppStoreCoachmark';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import ModuleLauncherModal from './ModuleLauncherModal';

const iconBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

const appStoreBtn =
  'inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition-all shrink-0 h-11 w-11 sm:h-8 sm:w-8 xl:h-9 xl:w-auto xl:min-w-[2rem] xl:px-2.5 text-xs xl:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md hover:shadow-blue-500/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

/**
 * TopBarQuickActions - the right cluster of the global search top bar.
 * Open Orders + Products (with live badges) and Notifications live here so the
  * Navbar has room for business name, referral, plan, and profile. Custosell Apps,
 * Tutorials, and Feedback are surfaced from the profile menu as lg+ shortcuts,
 * mirroring Custocare's hub shortcuts.
 */
export function TopBarQuickActions() {
  const [appsOpen, setAppsOpen] = useState(false);
  const user = useAppSelector((s) => s.auth.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const onboardingActive = Boolean(user?.onboarding?.needs_intent || user?.onboarding?.needs_tour);

  return (
    <div className="flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
      <HeaderQuickNav />
      <HeaderNotifications />

      <button
        type="button"
        onClick={() => setAppsOpen(true)}
        title="Custosell Apps"
        aria-label="Custosell Apps"
        data-tour="header-app-store"
        className={cn(appStoreBtn)}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xl:inline truncate">Custosell Apps</span>
      </button>

      <span className="ml-1 hidden items-center gap-1 border-l border-gray-200 pl-1 sm:gap-1.5 sm:pl-2 lg:flex">
        <NavLink
          to={ROUTES.GUIDE.TUTORIALS}
          title="Tutorials"
          aria-label="Tutorials"
          className={cn(iconBtn, 'h-8 w-8')}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
        </NavLink>
        <NavLink
          to={ROUTES.GUIDE.FEEDBACK}
          title="Feedback"
          aria-label="Feedback"
          className={cn(iconBtn, 'h-8 w-8')}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden />
        </NavLink>
      </span>

      <ModuleLauncherModal open={appsOpen} onClose={() => setAppsOpen(false)} />
      <AppStoreCoachmark
        userId={user?.id}
        firstName={firstName}
        onboardingActive={onboardingActive}
        paused={appsOpen}
        onOpenStore={() => setAppsOpen(true)}
      />
    </div>
  );
}

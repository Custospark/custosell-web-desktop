import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutGrid, MessageSquareText } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderQuickNav } from './HeaderQuickNav';
import ModuleLauncherModal from './ModuleLauncherModal';

const iconBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

/**
 * TopBarQuickActions — the right cluster of the global search top bar.
 * Open Orders + Products (with live badges) and Notifications live here so the
 * Navbar has room for business name, referral, plan, and profile. Apps,
 * Tutorials, and Feedback are surfaced from the profile menu as lg+ shortcuts,
 * mirroring Custocare's hub shortcuts.
 */
export function TopBarQuickActions() {
  const [appsOpen, setAppsOpen] = useState(false);

  return (
    <div className="flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
      <HeaderQuickNav />
      <HeaderNotifications />

      <span className="ml-1 hidden items-center gap-1 border-l border-gray-200 pl-1 sm:gap-1.5 sm:pl-2 lg:flex">
        <button
          type="button"
          onClick={() => setAppsOpen(true)}
          title="Apps"
          aria-label="Apps"
          className={cn(iconBtn, 'h-8 w-8')}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
        </button>
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
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { Bell, GraduationCap, HelpCircle, MessageSquareHeart, Sparkles } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useNotificationUnreadCount } from '../../../modules/notifications/api/NotificationQueries';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useUpdateOnboarding } from '../../../modules/onboarding/useOnboardingQueries';
import { cn } from '../../utils/cn';

const guideLinks = [
  { to: ROUTES.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
  { to: ROUTES.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
  { to: ROUTES.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-colors shrink-0',
    'h-11 w-11 sm:h-8 sm:w-8 xl:h-9 xl:w-auto xl:min-w-[2rem] xl:px-2.5',
    'text-xs xl:text-sm',
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  );

export function GuideHeaderNav() {
  const { isCompletelyOffline } = useNetworkStatus();
  const { data: unreadCount = 0 } = useNotificationUnreadCount(true);
  const replayTour = useUpdateOnboarding();

  return (
    <nav
      className="flex items-center gap-0.5 sm:gap-1 shrink-0 min-w-0"
      aria-label="Tutorials, FAQs, feedback, and notifications"
    >
      {/* Tight guide cluster — excludes notifications so the spotlight is exact */}
      <div className="flex items-center gap-0.5 sm:gap-1" data-tour="navbar-guide">
        <button
          type="button"
          title={isCompletelyOffline ? 'Replay product tour (works offline)' : 'Replay product tour'}
          aria-label="Replay product tour"
          disabled={replayTour.isPending}
          onClick={() => {
            // Local apply is synchronous inside the mutation — tour opens immediately (online or offline)
            replayTour.mutate({ action: 'replay_tour' });
          }}
          className={cn(
            'inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-colors shrink-0',
            'h-11 w-11 sm:h-8 sm:w-8 xl:h-9 xl:w-auto xl:min-w-[2rem] xl:px-2.5',
            'text-xs xl:text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden xl:inline truncate">Tour</span>
        </button>
        {guideLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            aria-label={label}
            className={navLinkClass}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden xl:inline truncate">{label}</span>
          </NavLink>
        ))}
      </div>

      <NavLink
        to={ROUTES.ACCOUNT.NOTIFICATIONS}
        title={isCompletelyOffline ? 'Notifications (saved for offline)' : 'Notifications'}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={({ isActive }) => cn(navLinkClass({ isActive }), 'relative')}
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xl:inline truncate">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] sm:min-w-4 sm:h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] sm:text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isCompletelyOffline && (
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
        )}
      </NavLink>
    </nav>
  );
}

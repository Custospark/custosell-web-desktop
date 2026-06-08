import { NavLink } from 'react-router-dom';
import { Bell, GraduationCap, HelpCircle, MessageSquareHeart } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useNotificationUnreadCount } from '../../../modules/notifications/api/NotificationQueries';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { cn } from '../../utils/cn';

const guideLinks = [
  { to: ROUTES.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
  { to: ROUTES.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
  { to: ROUTES.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-medium transition-colors sm:px-2.5 sm:py-1.5 md:text-sm',
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  );

export function GuideHeaderNav() {
  const { isCompletelyOffline } = useNetworkStatus();
  const { data: unreadCount = 0 } = useNotificationUnreadCount(true);

  return (
    <nav
      className="flex items-center gap-0.5 shrink-0 min-w-0"
      aria-label="Tutorials, FAQs, feedback, and notifications"
    >
      {guideLinks.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} title={label} aria-label={label} className={navLinkClass}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden md:inline truncate">{label}</span>
        </NavLink>
      ))}

      <NavLink
        to={ROUTES.ACCOUNT.NOTIFICATIONS}
        title={isCompletelyOffline ? 'Notifications (saved for offline)' : 'Notifications'}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={({ isActive }) =>
          cn(navLinkClass({ isActive }), 'relative')
        }
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden md:inline truncate">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none md:top-1 md:right-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isCompletelyOffline && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white md:bottom-1 md:right-1" />
        )}
      </NavLink>
    </nav>
  );
}

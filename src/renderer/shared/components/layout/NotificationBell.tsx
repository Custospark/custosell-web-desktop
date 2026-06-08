import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useNotificationUnreadCount } from '../../../modules/notifications/api/NotificationQueries';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { cn } from '../../utils/cn';

export function NotificationBell() {
  const navigate = useNavigate();
  const { isCompletelyOffline } = useNetworkStatus();
  const { data: unreadCount = 0 } = useNotificationUnreadCount(true);

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.NOTIFICATIONS.INDEX)}
      title={isCompletelyOffline ? 'Notifications (saved for offline)' : 'Your notifications'}
      className={cn(
        'relative p-2 rounded-lg transition-colors shrink-0',
        'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
      )}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {isCompletelyOffline && (
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
      )}
    </button>
  );
}

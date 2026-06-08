import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Inbox, Trash2 } from 'lucide-react';
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationUnreadCount,
} from './api/NotificationQueries';
import type { AppNotification } from './api/NotificationTypes';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';
import { cn } from '../../shared/utils/cn';

const TYPE_LABELS: Record<string, string> = {
  business_status: 'Account update',
  platform_message: 'Team message',
  user_status: 'Your account',
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { isCompletelyOffline } = useNetworkStatus();
  const { confirm } = useConfirm();
  const params = useMemo(
    () => ({
      per_page: '50',
      ...(filter === 'unread' ? { unread_only: 'true' } : {}),
    }),
    [filter],
  );

  const { data, isLoading, isFetching } = useNotifications(params);
  const { data: unreadCount = 0 } = useNotificationUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const notifications = data?.data ?? [];
  const hasMessages = notifications.length > 0;
  const actionPending = markAllRead.isPending || deleteAll.isPending || deleteNotification.isPending;
  const actionsDisabled = actionPending || isCompletelyOffline;

  const handleOpen = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, notification: AppNotification) => {
    e.stopPropagation();
    if (actionsDisabled) return;

    const ok = await confirm({
      title: 'Delete message',
      message: 'Remove this message from your inbox? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    deleteNotification.mutate(notification.id);
  };

  const handleDeleteAll = async () => {
    if (actionsDisabled || !hasMessages) return;

    const ok = await confirm({
      title: 'Delete all messages',
      message: 'Clear your entire inbox? This cannot be undone.',
      confirmText: 'Delete all',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    deleteAll.mutate();
  };

  return (
    <div className="w-full min-h-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Updates and messages from the Custosell team
          </p>
        </div>
        {(unreadCount > 0 || hasMessages) && (
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={actionsDisabled}
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Mark all as read
              </Button>
            )}
            {hasMessages && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleDeleteAll()}
                disabled={actionsDisabled}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete all
              </Button>
            )}
          </div>
        )}
      </div>

      {isCompletelyOffline && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          You are offline. Showing your saved messages — new ones will appear when you are back online.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
          {isFetching && !isLoading && (
            <span className="text-xs text-gray-400 ml-auto">Updating…</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton variant="table" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-12 h-12" />}
            title={filter === 'unread' ? 'You are all caught up' : 'No messages yet'}
            description={
              filter === 'unread'
                ? 'You have read everything we have sent you.'
                : 'When the Custosell team has something to share, it will show up here.'
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpen(n);
                  }
                }}
                className={cn(
                  'w-full text-left px-4 sm:px-6 py-5 transition-colors cursor-pointer',
                  'hover:bg-gray-50/80',
                  !n.is_read && 'bg-blue-50/40',
                )}
              >
                <div className="flex items-start gap-4 w-full">
                  <div
                    className={cn(
                      'mt-2 w-2.5 h-2.5 rounded-full shrink-0',
                      n.is_read ? 'bg-transparent' : 'bg-blue-500',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                      <p className={cn('text-base font-semibold', n.is_read ? 'text-gray-800' : 'text-gray-900')}>
                        {n.title}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">{formatWhen(n.sent_at)}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={n.is_read ? 'neutral' : 'primary'}>
                        {TYPE_LABELS[n.type] ?? 'Message'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 whitespace-pre-line leading-relaxed">
                      {n.message}
                    </p>
                    {n.metadata?.business_name && (
                      <p className="text-xs text-gray-400 mt-3">
                        For {String(n.metadata.business_name)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => void handleDeleteOne(e, n)}
                    disabled={actionsDisabled}
                    title="Delete message"
                    aria-label="Delete message"
                    className={cn(
                      'p-2 rounded-lg shrink-0 text-gray-400 transition-colors',
                      'hover:text-red-600 hover:bg-red-50',
                      'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

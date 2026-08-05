import { useCallback, useMemo, useState } from 'react';
import { Bell, CheckCheck, CheckSquare, ChevronDown, ChevronUp, Inbox, Square, Trash2, X } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import {
  useBulkDeleteNotifications,
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
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';
import { cn } from '../../shared/utils/cn';
import { OrderSoundCard } from './ui/OrderSoundCard';

const TYPE_LABELS: Record<string, string> = {
  business_status: 'Account update',
  platform_message: 'Team message',
  user_status: 'Your account',
};

const subtleDeleteButtonClass =
  'border border-red-200/70 bg-red-50/30 text-red-600/75 hover:bg-red-50/80 hover:border-red-300/80 hover:text-red-700';

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

function messagePreview(text: string, maxLength = 100): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { isCompletelyOffline } = useNetworkStatus();
  const user = useAppSelector((s) => s.auth.user);
  const isBusiness = Boolean(user?.business_id && user.account_type !== 'personal');
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
  const bulkDelete = useBulkDeleteNotifications();
  const deleteAll = useDeleteAllNotifications();

  const notifications = useMemo(() => data?.data ?? [], [data?.data]);
  const hasMessages = notifications.length > 0;
  const notificationIds = useMemo(() => notifications.map((n) => n.id), [notifications]);
  const allSelected = notificationIds.length > 0 && notificationIds.every((id) => selectedIds.has(id));
  const actionPending =
    markAllRead.isPending || deleteAll.isPending || deleteNotification.isPending || bulkDelete.isPending;
  const actionsDisabled = actionPending || isCompletelyOffline;

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(notificationIds));
  }, [allSelected, notificationIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (notification: AppNotification) => {
      setExpandedId(notification.id);
      if (!notification.is_read) {
        markRead.mutate(notification.id);
      }
    },
    [markRead],
  );

  const handleClose = useCallback((id: number) => {
    setExpandedId((current) => (current === id ? null : current));
  }, []);

  const handleDeleteIds = useCallback(
    async (ids: number[]) => {
      if (actionsDisabled || ids.length === 0) return;

      const ok = await confirm({
        title: ids.length === 1 ? 'Delete message' : 'Delete messages',
        message:
          ids.length === 1
            ? 'Remove this message from your inbox? This cannot be undone.'
            : `Delete ${ids.length} message(s)? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      try {
        if (ids.length === 1) await deleteNotification.mutateAsync(ids[0]);
        else await bulkDelete.mutateAsync(ids);

        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        if (expandedId != null && ids.includes(expandedId)) setExpandedId(null);
        imperativeToast.show('success', ids.length === 1 ? 'Message deleted.' : 'Messages deleted.');
      } catch {
        imperativeToast.show('error', 'Could not delete message(s).');
      }
    },
    [actionsDisabled, bulkDelete, confirm, deleteNotification, expandedId],
  );

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

    deleteAll.mutate(undefined, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setExpandedId(null);
      },
    });
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
                variant="outline"
                size="sm"
                onClick={() => void handleDeleteAll()}
                disabled={actionsDisabled}
                className={subtleDeleteButtonClass}
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

      {isBusiness && <OrderSoundCard />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-200">
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
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" aria-hidden />
                ) : (
                  <Square className="h-4 w-4 text-gray-500" aria-hidden />
                )}
                {allSelected ? 'Deselect all' : `Select all (${notifications.length})`}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-gray-300" aria-hidden>
                    |
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDeleteIds(Array.from(selectedIds))}
                    disabled={actionsDisabled}
                    className={subtleDeleteButtonClass}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>

            {notifications.map((n) => {
              const isExpanded = expandedId === n.id;
              const isSelected = selectedIds.has(n.id);

              return (
                <article
                  key={n.id}
                  className={cn(
                    'rounded-xl border-2 bg-white shadow-sm transition-colors',
                    isSelected ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200',
                    !n.is_read && !isSelected && 'border-blue-200 bg-blue-50/40',
                  )}
                >
                  <div className="flex items-start gap-3 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => toggleOne(n.id)}
                      disabled={actionsDisabled}
                      className="mt-1 shrink-0 text-gray-500 hover:text-gray-800 disabled:opacity-40"
                      aria-label={isSelected ? 'Deselect message' : 'Select message'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" aria-hidden />
                      ) : (
                        <Square className="h-5 w-5" aria-hidden />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-2">
                          {!n.is_read && (
                            <span
                              className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500"
                              aria-label="Unread"
                            />
                          )}
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-base font-semibold leading-snug',
                                n.is_read ? 'text-gray-800' : 'text-gray-900',
                              )}
                            >
                              {n.title}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Badge variant={n.is_read ? 'neutral' : 'primary'}>
                                {TYPE_LABELS[n.type] ?? 'Message'}
                              </Badge>
                              <span className="text-xs font-medium text-gray-500">{formatWhen(n.sent_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          {isExpanded ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleClose(n.id)}
                              className="border-gray-300 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50"
                            >
                              <X className="mr-1.5 h-4 w-4 text-gray-700" aria-hidden />
                              Close
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpen(n)}
                              className="border-blue-300 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100"
                            >
                              <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden />
                              Open
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteIds([n.id])}
                            disabled={actionsDisabled}
                            title="Delete message"
                            className="text-red-500/70 hover:bg-red-50/80 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
                          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{n.message}</p>
                          {typeof n.metadata?.business_name === 'string' && n.metadata.business_name.trim() !== '' && (
                            <p className="mt-3 text-xs font-medium text-gray-500">
                              For {n.metadata.business_name}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleClose(n.id)}
                            className="mt-4"
                          >
                            <ChevronUp className="mr-1.5 h-4 w-4" aria-hidden />
                            Hide message
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{messagePreview(n.message)}</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

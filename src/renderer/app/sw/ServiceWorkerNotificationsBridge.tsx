import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '../../modules/notifications/api/NotificationQueries';

type ServiceWorkerMessage = { type?: string; url?: string };

/**
 * Listens to messages sent by the service worker:
 * - `NAVIGATE`    - user tapped a system notification while the app was open;
 *                   route to the deep link (e.g. /account/notifications).
 * - `PUSH_RECEIVED` - a push arrived; refresh the bell so the count is current
 *                   without waiting for the 60s poll.
 * Mount once inside the Router.
 */
export function ServiceWorkerNotificationsBridge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent<ServiceWorkerMessage>) => {
      const { type, url } = event.data ?? {};

      if (type === 'NAVIGATE' && typeof url === 'string') {
        try {
          const target = new URL(url);
          navigate(`${target.pathname}${target.search}${target.hash}`);
        } catch {
          navigate(url);
        }
        return;
      }

      if (type === 'PUSH_RECEIVED') {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate, queryClient]);

  return null;
}
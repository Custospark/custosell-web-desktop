import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchWebPushStatus,
  removePushSubscription,
  storePushSubscription,
  urlBase64ToUint8Array,
} from '../api/webPushApi';

const isElectron =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

export const webPushKeys = { status: ['webpush', 'status'] as const };

function isSupported(): boolean {
  if (isElectron) return false;
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Browser Web Push enable/disable. Everything is driven from the user's toggle
 * (no effects), which keeps browser-permission prompting and pushManager
 * subscriptions tied to explicit user action. Server-side subscription count
 * from `/webpush/status` is the source of truth for the toggle state.
 */
export function useWebPush() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: status, refetch } = useQuery({
    queryKey: webPushKeys.status,
    queryFn: fetchWebPushStatus,
    staleTime: 30_000,
    refetchInterval: 120_000,
    enabled: isSupported(),
  });

  const supported = isSupported();
  const enabled = (status?.subscription_count ?? 0) > 0;
  const permission = supported ? Notification.permission : 'unsupported';

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        setError('Notifications are blocked in your browser. Allow them in your site/browser settings first.');
        return;
      }

      const push = await fetchWebPushStatus();
      if (!push.enabled || !push.public_key) {
        setError('Web push is not configured for this server yet.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(push.public_key),
        });
      }

      const json = subscription.toJSON();
      await storePushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
        },
      });

      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  }, [refetch]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      if (subscription) {
        await subscription.unsubscribe();
      }
      if (endpoint) {
        await removePushSubscription(endpoint).catch(() => undefined);
      }
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disable notifications.');
    } finally {
      setBusy(false);
    }
  }, [refetch]);

  const toggle = useCallback(async () => {
    if (enabled) {
      await disable();
    } else {
      await enable();
    }
  }, [enabled, enable, disable]);

  return { supported, enabled, busy, error, permission, toggle };
}
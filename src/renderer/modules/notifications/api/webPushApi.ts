import { axiosInstance } from '../../../app/api/axiosConfig';
import { WEB_PUSH } from '../../../shared/api/endpoints/endpoints';

export interface WebPushStatus {
  enabled: boolean;
  public_key: string | null;
  subscription_count: number;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function fetchWebPushStatus(): Promise<WebPushStatus> {
  const { data } = await axiosInstance.get<{ data: WebPushStatus }>(WEB_PUSH.STATUS);
  return data.data;
}

export async function storePushSubscription(subscription: PushSubscriptionPayload): Promise<void> {
  await axiosInstance.post(WEB_PUSH.SUBSCRIBE, subscription);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await axiosInstance.delete(WEB_PUSH.UNSUBSCRIBE, { data: { endpoint } });
}

/** Convert a base64url VAPID public key into the Uint8Array `pushManager` expects. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) array[i] = raw.charCodeAt(i);
  return array;
}

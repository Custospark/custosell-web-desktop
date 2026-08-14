# Web Push notifications (VAPID)

- **Date:** 2026-08-05
- **Status:** Accepted
- **Stack:** Frontend + Backend (cross-stack)

## Decision

Deliver **Web Push notifications** via the already-registered service worker so alerts reach the user **instantly and even when the app is closed**, instead of only inside the open app's 60s-polled bell.

Flow:

1. **Subscribe** (user toggles "Desktop notifications" on the Notifications inbox card): the client requests `Notification.requestPermission()`, reads the VAPID public key from `GET /api/v1/webpush/status`, calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, and POSTs `{ endpoint, keys: { p256dh, auth } }` to `POST /api/v1/webpush/subscribe`.
2. **Deliver**: the backend's `NotificationService::sendToUser` already persists new in-app notifications; it now also pushes that same new notification to the user's stored push subscriptions (deduped via the existing `contentKey`). The encrypted payload is `{ title, body, url, icon, tag }`.
3. **Show**: the service worker's `push` handler renders a system notification (`tag` collapses duplicates; `data.url` deep-links to `/account/notifications`). `notificationclick` focuses an existing app window and posts a `NAVIGATE` message (routed in-app via `useNavigate`), or opens a new window if the app is closed.
4. **Unsubscribe**: toggling off calls `subscription.unsubscribe()` then `DELETE /api/v1/webpush/unsubscribe` with the endpoint.

Design choices:

- **One toggle, server-backed truth.** The card's on/off state comes from `subscription_count` in `GET /webpush/status`, not local storage, so it stays correct across devices. No preference persistence needed client-side.
- **Push rides the existing notification pipeline.** Rather than adding events/listeners, `NotificationService::sendToUser` pushes only when a genuinely new in-app row was persisted - one dedupe path for bell + push, and every existing sender (orders, sales, platform, pipeline) gets push for free.
- **iOS**: Web Push is not supported by iOS Safari until the PWA is installed to the Home Screen (then it uses a Push API variant). The card still shows and handles the unsupported path by surfacing the browser permission result.
- **Electron skipped.** Web Push is a browser/web feature; `useWebPush` and the SW handlers no-op in Electron.

## Why

- The in-app bell polls every 60s and only while the app is open - a POS loses its most urgent signal (new open order) the moment the tab is closed.
- Push delivers server-initiated alerts to closed/backgrounded tabs and can deep-link back into the app, pairing with the PWA install prompt to make Custosell feel native.

## Files (Frontend)

- `public/sw.js` - `push` + `notificationclick` handlers; `push` also posts `PUSH_RECEIVED` to open windows so the bell refreshes instantly.
- `src/renderer/app/sw/ServiceWorkerNotificationsBridge.tsx` - in-app listener for `NAVIGATE` (deep-link routing) and `PUSH_RECEIVED` (invalidate `notificationKeys.all`); mounted in `App.tsx` inside the Router.
- `src/renderer/modules/notifications/api/webPushApi.ts` - status/subscribe/unsubscribe calls + `urlBase64ToUint8Array` VAPID conversion.
- `src/renderer/modules/notifications/hooks/useWebPush.ts` - `useWebPush()` hook; subscribe/unsubscribe driven from the toggle handler (no effects).
- `src/renderer/modules/notifications/ui/PushNotificationsCard.tsx` - settings card on the Notifications inbox.
- `src/renderer/modules/notifications/NotificationsPage.tsx` - renders the card.
- `src/renderer/shared/api/endpoints/endpoints.ts` - `WEB_PUSH` endpoints.
- `src/renderer/App.tsx` - mounts the SW message bridge.

## Failure states

- Permission denied/blocked → toggle shows a guidance message; no subscription is created.
- Server returns `enabled=false` / no `public_key` → user sees "not configured" and nothing is stored.
- Push service returns 410 Gone (endpoint expired) → backend deletes the stale subscription and keeps going.
- Push delivery/network error → logged server-side; in-app bell + polling still work (push is additive, not the only channel).
- SW not registered yet / offline → toggle surfaces the underlying error; the 60s bell poll remains the fallback.

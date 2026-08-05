# Sound notifications for order updates

- **Date:** 2026-08-05
- **Status:** Accepted
- **Stack:** Frontend (client-only; no backend change)

## Decision

Notify users with a short synthesized chime + toast when their orders change, using a **generic, client-only sound service** built on the **Web Audio API** (no audio files). Sound is **on by default** with a single toggle, persisted per device in `localStorage`.

Two triggers, two surfaces:

1. **Business — header Open Orders badge**: when a **new open order** appears in the header's 30s-polled open-orders list, play a **two-chime** alert (`useNewOrderChime`). Because it lives in `HeaderQuickNav` (shown across the whole app), it sounds no matter which page the user is on. Toggle lives at **Account → Notifications** (the `/account/notifications` inbox, which `/settings/notifications` redirects to).
2. **Buyer — public storefront My Orders**: when an existing order's **status changes**, play a **single chime** (`useOrderStatusChime`). Toggle lives in a new **Notifications modal** opened from the Discover account menu (Profile pattern), i.e. "notifications via modal" for online buyers.

Both fire even when the tab/window is **not focused** (the order list poll hooks already use `refetchIntervalInBackground`). Audio is unlocked on the first user interaction (`pointerdown`/`keydown`) because browsers/Electron require a user gesture before an `AudioContext` can start.

## Why

- Order lists already poll every 30s; the only missing piece was a non-visual alert for a new online order while a business works elsewhere in the app.
- Web Audio synthesis avoids committing binary audio assets, works offline, and is tiny.
- A single global sound preference (rather than per-feature flags) matches the existing simple settings surface and is easy to reason about.

## Files

- `src/renderer/app/sound/orderChime.ts` — Web Audio synth engine: `playChime(times, freq)`, `playNewOrderChime()` (2 chimes), `playStatusChime()` (1 chime), `unlockAudio()`, `setSoundMuted()`, `isSoundMuted()`.
- `src/renderer/app/sound/soundPreferences.ts` — `localStorage` persistence (`custosell.sound.prefs.v1`), default `orderSound: true`.
- `src/renderer/app/sound/useSoundPreferences.ts` — reactive hook; syncs engine mute with stored value.
- `src/renderer/app/sound/useNewOrderChime.ts` — business-side watcher; baselines first render, alerts on new open orders (source-agnostic — matches the header Open Orders badge).
- `src/renderer/app/sound/useOrderStatusChime.ts` — buyer-side watcher; baselines first render, alerts on known-order status changes.
- `src/renderer/shared/components/layout/HeaderQuickNav.tsx` — global mount (polls open orders every 30s); calls `useNewOrderChime(openOrders)`.
- `src/renderer/modules/storefront/MyOrdersPage.tsx` — calls `useOrderStatusChime(allOrders)`.
- `src/renderer/modules/notifications/NotificationsPage.tsx` — business "Order sound" toggle card (top of inbox).
- `src/renderer/modules/settings/ui/NotificationsModal.tsx` — buyer "Order status sound" toggle modal.
- `src/renderer/modules/storefront/ui/DiscoverAccountMenu.tsx` — "Notifications" menu item + modal mount.
- `src/renderer/App.tsx` — one-time audio unlock on first interaction.

## Failure states

- `AudioContext` unavailable / autoplay blocked → `playChime` no-ops; toasts still surface the change (visual fallback always present).
- `localStorage` unavailable → defaults apply in-memory (`orderSound: true`).
- First render is always a silent baseline, so opening a page never replays old orders.
- Toggle off → engine muted immediately; toasts stop being produced by the watchers (they check the preference too).

# App shell & global UI

Layout and status UI changes that keep the POS usable and readable under offline/degraded conditions.

## Status banners (above layout)

Rendered in `AppStatusBanners.tsx` → `AppChrome.tsx` **above** `Layout` so the navbar and sidebar keep consistent height and shape.

| Banner | Component | When shown |
|--------|-----------|------------|
| Auth pending | `AuthPendingBanner` | `auth.pendingAuthSync` (offline registration only) |
| Offline | `OfflineBanner` | `network.showOfflineBanner` (dismissible, persisted) |
| Sync progress | `SyncProgressBanner` | Sync coordinator running / paused / failed / complete |

Dismiss state for offline banner: `offline/core/offlinePreferences.ts` + `networkSlice.dismissOfflineBanner`.

## Navbar

`Navbar.tsx`:

| Element | Behavior |
|---------|----------|
| **Network status** | `online` = emerald, `slow` = orange, `offline` = red (`NETWORK_STATUS_THEME`) |
| **Sync chip** | `SyncHeaderChip` — compact % when sync active |
| **Shift badge** | Shows `shift_clock_in` from auth slice (md+ breakpoint) |
| **Guide nav** | Tutorials, FAQs, notifications (offline dot on notifications when offline) |

Network button calls `checkNetworkConnectivity()` on click (retry probe).

## Sidebar

`Sidebar.tsx` uses absolute positioning; removed offline-banner `top` offset hack after banners moved above layout.

## Dashboard charts

`DashboardCharts.tsx` uses My Shift–style area chart for 7-day net sales trend. Graph subtitles use uppercase tracking-wide styling (`chartPrimitives.tsx`).

## Sales / shift offline hints

- `MyShiftPage` — amber offline strip when `isCompletelyOffline`
- `New Sale`, `RefundPanel` — offline sale/refund messaging
- Pending sync badges on lists (sales, products, staff, etc.)

## Routes

Sales module routes are eagerly bundled for offline chunk loading (see [../offline/sales.md](../offline/sales.md)).

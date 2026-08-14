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
| **Hamburger** | **Desktop (`lg+`) only** - collapses/expands the sidebar. On mobile, open the drawer via the bottom **Menu** tab instead. |
| **Network status** | `online` = emerald, `slow` = orange, `offline` = red (`NETWORK_STATUS_THEME`); larger tap targets on small screens |
| **Sync chip** | `SyncHeaderChip` - compact % when sync active |
| **Shift badge** | Shows `shift_clock_in` from auth slice (lg+ in the header; also in the profile menu on small screens) |
| **Apps launcher** | 9-dot control left of Guide - opens `ModuleLauncherModal` (boards-style) with only modules the signed-in user can access |
| **Guide nav** | Tutorials, FAQs, notifications (offline dot on notifications when offline) |

Network button calls `checkNetworkConnectivity()` on click (retry probe).

Module launcher catalog: `moduleLauncherCatalog.ts`. Visibility = staff/owner drawer modules + Account/Guide defaults + Platform/Guide Settings for platform admins (see ADR `2026-07-11-navbar-module-launcher`).

## Mobile bottom tabs (auth, below `lg`)

`AppMobileTabBar.tsx` - in-flow thumb bar under Main (not fixed overlay): **Menu** | **first two accessible leaf routes** | **More**. Leaves resolve via `resolveAccessibleNavLeaves`. **More** opens a sheet with Browse the app (friendly copy, no “modules” wording) + quick links. Footer is `lg+` only. See ADR `2026-07-14-auth-mobile-bottom-tabs`.

## Sidebar

`Sidebar.tsx` uses absolute positioning; removed offline-banner `top` offset hack after banners moved above layout.

When completely offline, online-only modules and subnavs (Pipeline, Estimates, Documents, Forecasting, HR, Accounting, Platform, Marketplace / POs / Incoming / Supplier invoices, **Online Shopping**) render as disabled controls (`cursor-not-allowed`, opacity, native `title` hover). Sales invoices stay enabled. Registry: `onlineOnlyNav.ts`.

## Main content

If the user is already on an online-only route while offline, `Main.tsx` shows `OnlineOnlyModuleBanner` (no redirect).

## Dashboard charts

`DashboardCharts.tsx` uses My Shift-style area chart for 7-day net sales trend. Graph subtitles use uppercase tracking-wide styling (`chartPrimitives.tsx`).

## Sales / shift offline hints

- `MyShiftPage` - amber offline strip when `isCompletelyOffline`
- `New Sale`, `RefundPanel` - offline sale/refund messaging
- Pending sync badges on lists (sales, products, staff, etc.)

## Routes

Sales module routes are eagerly bundled for offline chunk loading (see [../offline/sales.md](../offline/sales.md)).

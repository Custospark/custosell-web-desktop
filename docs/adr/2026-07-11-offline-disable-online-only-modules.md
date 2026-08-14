# ADR: Disable online-only modules in nav when offline

**Date:** 2026-07-11  
**Status:** Accepted  
**Scope:** Frontend shell (sidebar, module launcher, Main banner)

## Context

Several modules have no IndexedDB / mutation-queue path (Pipeline, Estimates, Documents, Forecasting, HR, Accounting, Platform, B2B supply, **Discover / My Orders**). Users could still open them from the sidebar while offline and hit empty/error states. Oscar asked to grey them out with `cursor-not-allowed` and a hover explanation; Sales invoices stay available offline; already-on-page stays with a banner only (no redirect).

## Decision

1. Registry: `onlineOnlyNav.ts` lists path prefixes + launcher slugs.
2. When `systemStatus === 'offline'` (`isCompletelyOffline`):
   - Sidebar: replace matching `NavLink`s with `OfflineDisabledNav` (opacity + not-allowed + `title` message). Inventory core items stay enabled; Marketplace / PO / Incoming / Supplier invoices / **Discover & My Orders** disable.
   - Module launcher: disable matching tiles (incl. `discover`); Inventory / Sales / etc. stay clickable.
3. If the user is already on an online-only route when going offline, `Main` shows `OnlineOnlyModuleBanner` - no auto-redirect.
4. `slow` is not treated as offline.

## Consequences

- Clear offline navigation boundaries without blocking POS / sales invoices.
- Hover copy explains why a tile is disabled.
- Page-level supply banners removed from list pages (Main owns the banner); settings supply card still uses `SupplyOfflineBanner`.

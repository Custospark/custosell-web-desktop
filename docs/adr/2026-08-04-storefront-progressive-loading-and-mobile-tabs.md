# ADR: Storefront progressive loading + mobile tab dedup

**Date:** 2026-08-04  
**Status:** Accepted

## Context

Large storefront catalogs were a single-shot render: a shop's products endpoint
returned the entire catalog (e.g. 3,000 products) in one response, and the
`ShopPage` rendered them all at once — jamming the UI. The Discover products/businesses
lists already paginated server-side but revealed items via a manual "Show more"
button. Separately, the auth-shell mobile bottom tab pinned the first two accessible
leaves from catalog order; because the overflow sheet kept whole nav groups, a pinned
"Orders" also reappeared in the More sheet (two "Orders").

## Decision

### 1. Paginated, scroll-wise products

- Backend `StorefrontController::products()` now accepts `per_page`/`page` and returns
  `meta` (current_page, last_page, per_page, total) alongside `data` + `shop`.
  `StorefrontService::shopProducts()` returns a `LengthAwarePaginator`.
- Frontend `useStorefrontShopProductsInfinite(slug, category)` pages at 24/page using
  `useInfiniteQuery` + a new `storefrontKeys.productsPages` key.
- New `useRevealMore` hook (storefront) renders the first chunk (36) and reveals more
  via an IntersectionObserver sentinel as the user scrolls, fetching the next page only
  once everything loaded is already showing, and only while the sentinel is on screen.
  It never writes `useRef` values during render (eslint `react-hooks/refs` clean) —
  latest callbacks are read through effect deps instead.
- Applied to `ShopPage`, `DiscoverProductsBrowse`, and `DiscoverShopsBrowse`. The manual
  "Show more" button is retained as an explicit fallback; scroll auto-reveal is primary.

### 2. Deterministic mobile pins, no duplicate

- `AppMobileTabBar` pins **Products** (Inventory) then **Orders** (Sales) whenever both
  leaves are accessible, so Orders sits directly after Products; otherwise falls back to
  the first two accessible leaves.
- `remainingLeaves` (the More sheet) now excludes any pinned destination, so a pinned tab
  never duplicates in the overflow list.

## Consequences

- Large shop catalogs load progressively instead of hanging on one giant fetch.
- "Orders" appears exactly once on the mobile tab bar (Products, then Orders).
- Backward compatible: consumers that ignore `meta` still read `data` correctly.
- Related: [2026-07-14-auth-mobile-bottom-tabs.md](./2026-07-14-auth-mobile-bottom-tabs.md).

## Key files

- Backend: `app/Http/Controllers/Api/StorefrontController.php`,
  `app/Services/Storefront/StorefrontService.php`
- Frontend: `src/renderer/modules/storefront/api/storefrontQueries.ts`,
  `src/renderer/modules/storefront/api/storefrontQueryKeys.ts`,
  `src/renderer/modules/storefront/ui/useRevealMore.ts`,
  `src/renderer/modules/storefront/ShopPage.tsx`,
  `src/renderer/modules/storefront/ui/DiscoverProductsBrowse.tsx`,
  `src/renderer/modules/storefront/ui/DiscoverShopsBrowse.tsx`,
  `src/renderer/shared/components/layout/AppMobileTabBar.tsx`
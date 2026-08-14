# ADR: Discover shop under `/discover/shop/:slug`

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Permanent fix for strip/tab navigation while a specific shop is open; place-order → My Orders + strip count

## Context

Opening a specific shop broke Discover strip tabs: URL could change (Shops / Products / Orders) but the main area did not show the matching page. Partial “keep catalog mounted hidden” mitigations and a root catch-all shop route made this worse under Electron `HashRouter`.

## Bug autopsy (symptoms → causes)

| Symptom | Cause |
|---------|--------|
| After opening a shop, strip clicks change the URL but main stays blank or stuck on the shop | Dual render: layout sometimes showed a hidden `DiscoverPage` and sometimes skipped `<Outlet />`. When browse/shop/orders flags disagreed, **neither** branch rendered → blank main. |
| Same stuck UI after “Outlet-only” attempt | `<Outlet key={pathname} />` remounted Outlet on every path change. In React Router 7, **keying `<Outlet />` breaks child route rendering** after navigation. |
| Shop page thrashing / dead UI after open | `ShopPage` header `useEffect` depended on the whole `shell` context object. Every `setHeader` recreates that object → effect cleanup/`setHeader` loop (**max update depth** risk). |
| Root `/@:slug` via `/:shopHandle` under Discover | Catch-all competed with Discover ownership; share URLs and in-app browse fought each other. |

## Decision

1. **In-app shop path:** `ROUTES.SHOP(slug)` → `/discover/shop/:slug`.
2. **Nested layout route:** `path="/discover"` → `DiscoverLayout`; children: `index` (DiscoverPage), `shop/:slug`, `my-orders`.
3. **Visible page = Outlet only:** Always `<Outlet />` in the layout. **Never** put a React `key` on `<Outlet />`.
4. **Header effects** depend on stable `setHeader` only - never the whole shell context value.
5. **Public share URLs stay `/@slug`:** `ShopShareRedirect` (last-route `/:shopHandle` requiring leading `@`) → `/discover/shop/:slug`. `storefrontShareUrl` always emits path URLs (`{origin}/@{slug}`) - never HashRouter `#/@slug` - so QR / WhatsApp / copy work on phones and the public web.
6. **QR sizing:** Shop page ~96px; shop list cards ~72px QR on the right.
7. **Place order → orders UI:** List + strip badge share `useMyStorefrontOrdersList` (same cache). Place-order invalidates/refetches that query - never bump the badge without list data.

## Consequences

- Strip tabs always swap the matched child through Outlet; URL and visible page stay aligned.
- Share/QR links remain `/@slug` for marketing; one redirect hop into Discover.
- Orders strip badge shows buyer order total; My Orders list refreshes after place-order.
- Unknown single-segment paths without `@` redirect to Discover (no dedicated 404).

## Failure states

| Case | Behavior |
|------|----------|
| Invalid / missing slug | ShopPage → `/discover?focus=shops` |
| Share handle without `@` | Redirect → `/discover` |
| Strip while on shop | Close cart → `/discover?focus=shops\|products` via navigate; Outlet swaps to DiscoverPage |
| Place-order success | Clear bag; invalidate my-orders queries; strip count +1 then refetch total |
| Place-order 401 | Prompt sign-in; retry after success |
| Guest (no token) | Orders count hidden (0); Orders tab prompts sign-in |

## Do not regress

- Do not remount Outlet with `key={path}`.
- Do not dual-mount a hidden Discover catalog beside a conditional Outlet.
- Do not put `shell` (whole context) in `useEffect` dependency arrays that call `setHeader`.
- Do not put shop pages on a root catch-all that is not a share redirect.

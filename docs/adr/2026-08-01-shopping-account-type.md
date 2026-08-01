# Shopping account type (storefront_buyer) — Discover-only experience

**Date:** 2026-08-01
**Status:** Accepted

## Context

Storefront buyers previously registered through the Personal flow, which the backend flattened to `account_type = 'personal'` and auto-created a workspace + subscription. That surfaced a dashboard, plans, and billing to people who only want to shop on Discover. This feature makes the shopping account a first-class type across the frontend.

## Decision

- **Register page** (`AccountTypeSelector` + `RegisterPage`) now offers a third **"For shopping"** option (emerald, `ShoppingBag` icon) alongside Business and Personal. It submits `account_type: 'storefront_buyer'` through a new reusable **`SimpleAccountForm`** (name/email/phone/password + country code) shared by Personal and Shopping; `RegisterPage` stays ≤500 lines.
- **Public store signup modals** (`StorefrontAuthPanel`) already sent `storefront_buyer` — unchanged, but now that backend preserves the type, these users are recognized as shopping accounts.
- **Storefront bottom nav** (`ConnectedStorefrontStrip`): passes `onHome={undefined}` when the user `isStorefrontBuyer(...)`, so the **Dashboard/Home tab is hidden** — the strip shows Products / Orders / More only. `StorefrontActionStrip` already renders the home tab only when `onHome` is set.
- **`DiscoverAccountMenu`**: hides the "App home / Account home" menu item for shopping accounts; Wishlist / My orders / Account / Guide remain.
- **`Navbar`** brand label resolves to **"Shopping"** for `storefront_buyer` (vs Personal for `personal`, business name otherwise).
- **`moduleAccess.ts`**: new `isStorefrontBuyer(user)` helper. `getAccessibleModules` seeds `account/guide/discover` for everyone, so shopping users get Discover/Account/Guide and nothing else; `getDefaultRoute` already returns `ROUTES.DISCOVER_MY_ORDERS` for business-less users with discover access — shopping accounts land on Discover after register/login.
- **`RegisterRequest`** type already permitted `'storefront_buyer'`; only its doc comment changed.

### Discover dropdown & bottom nav refinement (2026-08-01)

- **`DiscoverAccountMenu`** (shopping accounts only): **Custosell Guide removed**, and **Referrals** + **Profile** added — both open as **standard modals** (`ReferralsModal`, `ProfileModal` wrapping the shared `Modal` component). Referrals content was extracted from `AccountReferralsPage` into `ReferralsContent` so the page and the modal share one source of truth; `ProfileModal` reuses `ProfileSettingsForm` (which owns its own header + save state, so the modal renders without a title). The storefront buyer never needs the app sidebar.
- **`StorefrontActionStrip`** gained a `cartPrimary` prop: shopping accounts get **Cart as a primary tab** (in the slot the hidden Home/Dashboard would occupy) so the mobile bottom nav stays a consistent 4 tabs — **Cart · Products · Orders · More**. For shopping accounts Cart is removed from the More tray (leaving Businesses + Wishlist there); non-shopping accounts keep the prior Home/Products/Orders/More layout. `ConnectedStorefrontStrip` passes `cartPrimary={isStorefrontBuyer(user)}`.

### No shell-sidebar escapes (2026-08-01)

Shopping accounts must never reach the main app shell/sidebar. Removed/guarded every shell link reachable from the Discover UI:
- **`DiscoverAccountMenu`**: the **Account** item (→ `/account/notifications`, a shell page) is hidden for shopping accounts; the menu becomes Wishlist / My orders / Referrals / Profile / Logout. Non-shopping accounts keep it.
- **`ReferralsContent`**: the **Help & Contact** tab (its links all open the shell Guide pages) is hidden for shopping accounts — Wins/Policy remain.
- Verified `DiscoverLayout` renders no `Navbar`/`Sidebar`, and the storefront's only other `ROUTES` usages are Discover/Shop/Login/Home/Privacy/Terms (none are shell pages).

### Profile modal layout (2026-08-01)

`ProfileModal` wraps `ProfileSettingsForm` in a `px-4 sm:px-6` container (modal body `p-0`). The form's full-bleed sticky save bar (`-mx-4 sm:-mx-6`) now aligns flush to the panel edges instead of overflowing a padded body, and content gets comfortable padding on all breakpoints. Modal `size="xl"`, body scrolls, `max-h-[90vh]`.

Backend (ADR-024 in `Backend/docs/decisions.md`) preserves the `storefront_buyer` type, returns `active_plans: []`, re-classifies legacy `personal + null business_id` users, and adds Shopping FAQ/welcome copy.

### Always-fresh Discover catalogs (2026-08-01)

Products & Services and Businesses pages must never show stale cached data. `useStorefrontDiscoverInfinite`, `useStorefrontShopsInfinite`, and `useStorefrontCategories` were 10-min/60s `staleTime` with `refetchOnWindowFocus: false` — a shop's listing/stock change stayed stale for the whole window. Now:
- `staleTime: 0` (never treated as fresh), `refetchOnMount: 'always'`, `refetchOnWindowFocus: 'always'` — every visit/refocus refetches.
- `refetchInterval: 60s` while the Discover page is open keeps an idle tab current (pauses in background).
- `prefetchStorefrontCatalogs` warm-cache uses the same `staleTime: 0`, so the prefetch never masks a stale read.

## Consequences

- Shopping accounts never see a dashboard, plans, billing, or workspace in the UI.
- Registering as a shopper from the main register page or any public store both produce the same `storefront_buyer` account.
- `SimpleAccountForm` centralizes the simple-account UX (personal + shopping) to keep `RegisterPage` within the 500-line rule.

## Test results

`npx tsc --noEmit` clean; `npm run vera:fast` passed (8 changed files: eslint + 7 logic rules incl. file-size-500).

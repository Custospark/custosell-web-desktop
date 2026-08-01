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

Backend (ADR-024 in `Backend/docs/decisions.md`) preserves the `storefront_buyer` type, returns `active_plans: []`, re-classifies legacy `personal + null business_id` users, and adds Shopping FAQ/welcome copy.

## Consequences

- Shopping accounts never see a dashboard, plans, billing, or workspace in the UI.
- Registering as a shopper from the main register page or any public store both produce the same `storefront_buyer` account.
- `SimpleAccountForm` centralizes the simple-account UX (personal + shopping) to keep `RegisterPage` within the 500-line rule.

## Test results

`npx tsc --noEmit` clean; `npm run vera:fast` passed (8 changed files: eslint + 7 logic rules incl. file-size-500).

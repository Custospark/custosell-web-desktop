# ADR: Storefront multi-cart + submit-time auth

**Date:** 2026-07-12  
**Status:** Accepted

## Context

Discover buyers shop across multiple public businesses. A single in-memory shop cart disappeared when leaving `/@slug`, strip navigation felt slow/confusing, and guests could place orders without an account while My Orders required Sanctum.

## Decision

1. **Multi-cart bags** keyed by shop slug, persisted in `localStorage` (`custosell.storefront.carts.v1`), owned by `StorefrontMultiCartProvider` inside DiscoverLayout.
2. **Cart hub sheet** (Marketplace-inspired) lists bags; checkout submits **one bag at a time** to that business. Each bag chip has an **X** that confirms via shared `useConfirm` before `clearBag(slug)` (discard without ordering). Delivery contact uses a Sales-style tap row → modal (not an inline form).
3. **Browse freely; account only on Place order / Orders / header** via in-shell **modal** (no dim/blur backdrop). **Create account is the default tab**; sign-in is secondary. Cart bag does **not** embed an auth form - guest **Place order** opens the modal. Uses `POST /auth/register` with `account_type=storefront_buyer` or `useLogin({ redirect: false })`.
4. **Backend:** `POST /storefront/{slug}/orders` requires `auth:sanctum`. Place-order attaches the buyer as a seller `Customer` (`customers.user_id`) and sets `order.customer_id`. Guest place-order returns 401.
5. **Scroll:** `ScrollToTop` resets window + `[data-scroll-container]` (app Main, Discover main, Marketplace body) on every `pathname`/`search` change.
6. **Stacking:** shared `Modal` `z-[20000]`, confirm `z-[21000]` - above cart sheet / strip.

## Consequences

- Cart badge = sum of lines across all bags.
- Contact name/phone still required for shop fulfillment; prefilled from auth profile when available.
- Guest My Orders / header open the same create-account-first dialog (not business `/register`).
- Shoppers with `business_id = null` land on Discover My Orders when leaving the shell via “My orders”.
- Public storefront ADR guest-order note is superseded for place-order auth.

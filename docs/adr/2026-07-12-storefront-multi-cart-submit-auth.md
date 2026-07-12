# ADR: Storefront multi-cart + submit-time auth

**Date:** 2026-07-12  
**Status:** Accepted

## Context

Discover buyers shop across multiple public businesses. A single in-memory shop cart disappeared when leaving `/@slug`, strip navigation felt slow/confusing, and guests could place orders without an account while My Orders required Sanctum.

## Decision

1. **Multi-cart bags** keyed by shop slug, persisted in `localStorage` (`custosell.storefront.carts.v1`), owned by `StorefrontMultiCartProvider` inside DiscoverLayout.
2. **Cart hub sheet** (Marketplace-inspired) lists bags; checkout submits **one bag at a time** to that business.
3. **Browse freely; sign in only on Place order** via humble email/password dialog (`useLogin({ redirect: false })`) so buyers stay in Discover.
4. **Backend:** `POST /storefront/{slug}/orders` requires `auth:sanctum` (plus existing throttle). Guest place-order returns 401.

## Consequences

- Cart badge = sum of lines across all bags.
- Contact name/phone still required for shop fulfillment; prefilled from auth profile when available.
- Guest My Orders opens the same in-shell login dialog.
- Public storefront ADR guest-order note is superseded for place-order auth.

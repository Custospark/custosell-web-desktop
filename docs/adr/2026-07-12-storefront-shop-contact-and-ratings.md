# ADR: Storefront shop contact fields + product ratings

- **Status:** Accepted
- **Date:** 2026-07-12

## Context

Discover shop cards needed description, location, phone, and email. Buyers also needed a simple way to rate products with stars. Tab switches between Shops and Products felt slow because each switch remounted the browse panel.

## Decision

1. Extend `publicShopPayload` with `address`, `state`, and `business_email` (existing business columns; no migration).
2. Add `product_storefront_ratings` (unique product+user, rating 1–5) and expose `rating_avg` / `rating_count` / `my_rating` on storefront product payloads. Rate via `POST /storefront/{slug}/products/{id}/ratings` (Sanctum).
3. Keep Shops and Products browse panels mounted in `DiscoverPage`; toggle with `hidden`/`block` while syncing `?focus=` for deep links and strip nav.

## Consequences

- Shop contact details are public when storefront is enabled (same posture as Marketplace public resources).
- Rating requires sign-in; Discover shell applies a pending rating after in-shell login.
- Instant tab UX depends on both panels staying mounted (accept double memory for catalogs already warmed in React Query).

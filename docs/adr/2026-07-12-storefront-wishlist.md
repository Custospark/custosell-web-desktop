# ADR: Discover wishlist (save for later)

**Date:** 2026-07-12  
**Status:** Accepted (amended)  
**Scope:** Frontend + Backend Discover storefront

## Context

Buyers want to save products/services to buy later without committing to a cart bag, then move them into a shop bag and place orders.

## Decision

1. Heart toggle on product tiles + detail modal (auth required).
2. **Server-backed** wishlist (`product_wishlists`, Sanctum). Guests must sign in to save.
3. Page `/discover/wishlist` — **Add** puts the item into that shop’s cart; the item **stays** on the wishlist until place-order succeeds on the server.
4. Bottom strip: **Wishlist** chip sits **immediately left of Orders**, with live count badge (no header heart).
5. `placeOrder` removes ordered `product_id`s from the buyer’s wishlist **only after** the Backend records the order; FE updates wishlist cache in `onSuccess`, then refetches.
6. Heart toggle uses **product_id** for remove (`DELETE /wishlist/by-product/{id}`) so optimistic temp row ids never break unsave. Add seeds the list cache and replaces the temp row with the server row on success.

## Consequences

- Wishlist and Orders badges update immediately on heart, move-to-cart, and place-order.
- Cross-device wishlist works once signed in.
- Mobile strip has six chips (Home · Products · Businesses · Cart · Wishlist · Orders).

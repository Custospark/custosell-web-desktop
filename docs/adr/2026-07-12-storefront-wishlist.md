# ADR: Discover wishlist (save for later)

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Frontend Discover storefront

## Context

Buyers want to save products/services to buy later without committing to a cart bag.

## Decision

1. Heart toggle on product tiles + detail modal.
2. Persist in `localStorage` keyed by `guest` or user id (`custosell.storefront.wishlist.v1.*`).
3. On sign-in, merge guest wishlist into the account list (account wins on duplicates).
4. Page `/discover/wishlist` — add to cart, remove, clear; header heart badge + account menu link.
5. No Backend sync in v1 (cross-device later). MoMo still out of scope.

## Consequences

- Guests can wishlist without auth.
- Lists are device-local until cloud sync is added.
- Strip stays at 5 tabs (wishlist lives in header) so mobile nav is not crushed.

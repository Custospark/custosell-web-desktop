# ADR: Storefront buyer phone reuse + My Orders Eye view

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Discover cart contact + My Orders line-item preview

## Context

Buyers retyped phone on every Discover cart even after a successful order. My Orders showed item counts and post-fulfillment docs but no PO/IO-style Eye preview of what was ordered while status is still open.

## Decision

1. **Contact persistence (device):** `custosell.storefront.buyerContact.v1` stores last `customer_name` / `customer_phone`. New bags inherit it; Save/place-order refreshes it. Prefill order: bag → saved contact → auth profile.
2. **Contact persistence (account):** On storefront place-order, update the buyer `User.phone` when a non-empty phone is submitted. My Orders list also returns `customer_phone` / `customer_name` so opening My Orders can rehydrate local prefs.
3. **Eye on My Orders:** `GET /storefront/my-orders` includes `items[]` (id, product name, qty, prices). FE Eye opens `ViewMyStorefrontOrderModal` (same pattern as PO/IO). Receipt/Invoice actions remain for completed/invoiced.

## Consequences

- Reorders skip re-entering phone; buyers can still edit in the delivery modal.
- Open orders are inspectable without waiting for fulfillment.
- Cart clear after place-order no longer wipes the remembered phone.

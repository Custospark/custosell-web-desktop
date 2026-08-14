# ADR: Product percentage discounts on storefront

- **Status:** Accepted
- **Date:** 2026-07-12

## Context

Merchants need simple “on sale” pricing on Discover / public shop without changing POS till behavior yet. Buyers must see struck-through regular prices and be charged the advertised sale amount at place-order.

## Decision

- Keep `products.unit_price` as the **regular** catalog price.
- Add nullable `discount_percent` (decimal 0-100). Effective sell price = `unit_price × (1 − discount_percent/100)` when percent > 0.
- Storefront catalog keeps `unit_price` as regular and adds `sale_price`, `discount_percent`, and `compare_at_price` (regular when on sale).
- `StorefrontService::placeOrder` charges `Product::effectiveUnitPrice()` so clients cannot underpay by ignoring the discount.
- POS New Sale continues to use raw `unit_price` in v1 (no till discount UI).
- Invoices, receipts, and accounting journal entries never call `effectiveUnitPrice` / `discount_percent`. POS sales and sale JEs use list `unit_price` or already-persisted line amounts. Storefront orders store the discounted line price at place-order time so fulfillment of **that** online order stays consistent - that is not a till-side product % leak.

## Consequences

- Merchant product form gains optional “Sale discount %” with live Was → Now preview.
- Discover cards, detail modal, cart bag totals, and checkout line totals use a shared FE helper (`productPrice.ts`).
- Offline product create/update syncs `discount_percent` with the rest of the product payload.

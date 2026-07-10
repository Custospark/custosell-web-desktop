# ADR-2026-07-10: Product vs Service Sales

**Status:** Accepted  
**Date:** 2026-07-10  
**Authors:** Custospark Product Development Team

## Context

Service businesses (salons, repair shops, consultancies) need to sell through the same POS and invoice UI as product retailers. Catalog items were always treated as stocked products: sales failed when `stock_quantity` was 0, refunds always restored stock, and all revenue posted to **Sales Revenue (4100)**. Config already defined **Service Revenue (4200)** but nothing used it.

## Decision

1. **Catalog discriminator:** `products.type` is `'product' | 'service'` (default `'product'`).
2. **Stock:** Only `type === 'product'` tracks stock (`tracksStock()`). Services force `stock_quantity = 0` on create/update; sales and refunds skip stock checks, decrements, restores, and stock movements.
3. **COGS:** `InventoryCogsService` excludes service lines. Refund COGS restore is product-only.
4. **Sale journals (`AutomationService`):** Split revenue credits by line type — product → `sales_revenue` (4100), service → `service_revenue` (4200). VAT unchanged. Debits still equal credits (payment/AR + VAT + revenue split + optional COGS).
5. **Invoice send (`AccountForInvoiceSent`):** When posting invoice revenue (no linked sale JE), split the same way. Description-only lines without `product_id` credit **4200**.
6. **Frontend:** Product/Service toggle in the form; POS sellable = active && (service || stock > 0); soft qty cap 9999 for services; offline ledger and optimistic stock updates skip services; low-stock stats exclude services.
7. **Refunds:** Sales returns (4400) remain the contra for all refunds; no separate service-returns account in v1.

## Consequences

### Positive

- One sales UI for products and services.
- Correct P&L split between product and service revenue.
- Services never block on stock or pollute inventory/COGS.

### Negative

- Mixed carts with sale-level discounts rely on proportional scaling of line subtotals to the JE revenue total.
- Refunds for services still debit `sales_returns` (4400), not a dedicated service contra.

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| Separate `services` table | Duplicates catalog, tax, and cart plumbing. |
| `tracks_inventory` boolean only | Less clear for revenue account routing. |
| Post all revenue to 4100 | Leaves 4200 unused; weak reporting for service businesses. |

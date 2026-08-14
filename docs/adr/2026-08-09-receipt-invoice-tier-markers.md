# ADR - Receipt & Invoice Tier Markers (RP/WSP) and Line Discount Display

- **Date:** 2026-08-09
- **Status:** Accepted
- **Area:** Sales / POS, Invoices, Receipts

## Decision

Persist the price tier charged per line on the sale and reflect it, plus per-line discounts, on receipts and invoices.

1. **Persist `price_tier` on `sale_items`.** New migration adds `price_tier varchar(20) not null default 'retail'`. `SaleService::create` maps it from the client payload per item (`retail` | `wholesale`, defaulting to `retail`), `SaleItemResource` exposes it, `SaleRequest` validates it. The frontend sends `price_tier` per cart line (from `CartItem.price_tier` / order round-trip) on both the online payload and the offline queue, and `buildLocalSale` stamps it on offline items.
2. **Receipt line markers.** Each line prints the charged unit price tagged `(RP)` retail or `(WSP)` wholesale. Tier is read from `price_tier`; old / offline-mismatched rows fall back to inferring wholesale when `unit_price < product_price` (matching the existing backend rule that `product_price` is always the retail price). Line discounts are shown under the item as `disc −…` when `discount_amount > 0`.
3. **Receipt totals reconcile.** The backend bakes the global checkout discount into `sale.subtotal` (so the stored subtotal is already net of it). To avoid double-subtracting, the receipt now prints **Subtotal before the global discount** = `sale.subtotal + sale.discount_amount`, then `−Discount`, then VAT, then the stored TOTAL. Arithmetic now visibly adds up and matches the checkout summary.
4. **Invoices from sales.** `saleItemsToLineItems` and `cartItemsToLineItems` carry `priceTier` onto invoice builder rows and render `(RP)/(WSP)` beside the unit price, so discounting/tier is legible; invoice totals already equal the sale total (line discounts are folded into net unit price; global discount and tax are reused at seed time).

## Why

Receipts and invoices did not show whether a price was retail or wholesale, and line-item discounts were invisible on the receipt, making totals and tiers unverifiable against the checkout. The summary also showed a latent inconsistency: the receipt printed a `−Discount` row while `sale.subtotal` already included it, so the arithmetic did not reconcile to the printed TOTAL.

## What changed

- Backend: `2026_08_09_000000_add_price_tier_to_sale_items_table` migration; `SaleItem` fillable; `SaleService::create` stores per-line tier; `SaleItemResource` + `SaleRequest` updated.
- Frontend: `salesTypes` (`SaleItem.price_tier`, `CreateSalePayload.items.price_tier`); `BillingControls` sends tier; `completeOfflineSale` stamps it; `ReceiptContent` renders tier marker, per-line discount, and Subtotal-before-discount; `invoiceLineItems` + `InvoiceLineItemsTable` carry/render tier.
- Cross-stack note: offline queue replays the same payload shape, so no sync-contract special-casing is required.

## Out of scope

`invoice_items` still stores only net `unit_price`/`subtotal` (no discount column, no tier column); tier markers on invoices are display-only from the build seed and resolve for sync round-trips via the receipt/invoice relation to the linked sale.

---

## Update (2026-08-09): Applied
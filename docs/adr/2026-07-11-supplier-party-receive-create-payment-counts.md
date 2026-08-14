# ADR: Supplier party labels, receive create-product, PO payment counts

**Date:** 2026-07-11  
**Status:** Accepted  
**Modules:** Invoices, Payments, Inventory (supply chain)

## Context

1. Received (supplier) invoices often showed the **buyer** name because the shared invoice’s `customer` row is the buyer on the seller’s books, and `seller_business` was easy to miss when relations were not loaded.
2. Receiving a fulfilled PO required mapping every line to an **existing** local product - buyers could not stock items they ordered for the first time.
3. PO / Incoming lists did not surface how many payments were on the linked invoice.

## Decision

1. **Party labeling** - `InvoiceResource` always loads seller `business` and returns `seller_business`, `party_name`, and `party_role`. For `direction=received`, `party_name` is the **supplier**; FE `invoicePartyLabel` / receipt builders never fall back to `customer` for received invoices.
2. **Receive** - `POST .../receive` accepts either `product_id` (map existing) or `create_product: true` (create a buyer catalog product from the PO line, then stock in).
3. **Payment counts** - PO/IO resources expose `invoice.payments_count` + `payment_status`; UI shows a Payments column and `Receipts (N)` actions.

## Failure states

| Case | Behavior |
|------|----------|
| Receive with neither map nor create | 422 validation |
| Create + product_id together | 422 |
| Duplicate SKU on create | Suffix `-1`, `-2`, … until unique |
| Missing seller business name | `party_name` falls back to `"Supplier"` (not buyer customer) |

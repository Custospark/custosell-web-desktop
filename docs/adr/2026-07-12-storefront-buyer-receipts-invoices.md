# ADR: B2C storefront buyer receipts & invoices

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Discover My Orders document viewing (sale receipt + invoice)

## Context

B2B buyers view supplier invoices via `buyer_business_id` and `ViewInvoiceModal`. B2C Discover shoppers have `business_id = null` and were only seeing order status on My Orders.

## Decision

1. Enrich `GET /storefront/my-orders` with `sale_id`, `receipt_number`, `invoice_id`, `invoice_number`.
2. Add buyer-scoped `GET /storefront/my-orders/{id}/sale` and `.../invoice` (auth: `storefront_buyer_user_id`).
3. Reuse `ReceiptPreviewModal` + `ViewInvoiceModal` with `role="storefront_buyer"` (seed fetch, no seller invoice APIs / no Supplier invoices deep-link).
4. Place-order success already `clearBag(slug)` and now resets `activeSlug`.

## Non-goals

- Granting storefront buyers `/invoices` or `/sales` list access
- Buyer recording payments
- Mapping B2C onto `buyer_business_id`

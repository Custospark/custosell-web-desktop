# ADR: Document letterhead uses issuer (seller), not viewer

**Date:** 2026-07-11  
**Status:** Accepted  
**Scope:** Frontend + Backend (invoices, payment receipts)

## Context

B2B marketplace invoices are owned by the **seller** (`invoice.business_id`) and visible to the **buyer** (`buyer_business_id`). When Oscar Store buys from Custospark:

| Role on document | Correct party |
|------------------|---------------|
| Letterhead / header | Custospark (seller / issuer) |
| Customer / Bill To | Oscar Store (buyer customer record) |

The UI receipt header (`ReceiptBusinessHeader` / `useReceiptBusiness`) always used the **logged-in** business. A buyer viewing a supplier payment receipt therefore printed their own name in the header. Invoice/payment PDF builders risked the same when they used `$request->user()->business` instead of `invoice.business`.

Walk-in POS receipts stay correct: issuer === logged-in business.

## Decision

1. **API** - `InvoiceResource.seller_business` is a full issuer snapshot (name, contacts, address, currency, `receipt_footer`).
2. **FE receipts** - For `direction === 'received'`, pass `invoice.seller_business` into `ReceiptBusinessHeader` / `PaymentReceiptContent` as `issuerBusiness`. `customerName` remains `invoice.customer` (buyer).
3. **Invoice PDF** - `InvoicePdfBuilder` / `InvoiceController::downloadPdf` letterhead = `invoice.business` (issuer).
4. **Payment receipt PDF** - `PaymentReceiptPdfBuilder` letterhead = `invoice.business` when payable is an invoice. Buyers may download receipts for payments on invoices where they are `buyer_business_id`; email remains seller-only.

## Consequences

- Buyer UI print and PDF show seller branding + buyer as Customer.
- Seller POS and sales-invoice receipts unchanged (no override → logged-in business).
- Failure: if `seller_business` is missing on a received invoice, FE falls back to logged-in business (degraded). Backend always loads `business` on invoice resources.

## Failure states

| Case | Behavior |
|------|----------|
| Stale cache without `seller_business` | Header may show buyer until refetch |
| Buyer PDF download | Allowed for visible B2B invoice payments; letterhead still seller |
| Buyer email receipt | Still 404 / owner-only - seller sends |
| Normal sale receipt | Viewer business = issuer - no change |

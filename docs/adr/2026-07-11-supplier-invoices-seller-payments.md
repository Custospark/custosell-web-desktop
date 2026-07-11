# ADR: Seller-only payments and Supplier invoices UX

**Date:** 2026-07-11  
**Status:** Accepted  
**Modules:** Inventory (supply chain), Invoices / Payments

## Context

After PO accept, one seller-owned invoice is shared with the buyer (`buyer_business_id`). Buyers were able to record payments and were pushed to a generic Invoices list — which confused AR (what you issue) with AP (what suppliers bill you).

## Decision

1. **Seller-only payment recording** — `InvoiceService::canManagePayments` is owner-only. Buyers may still GET/list/PDF received invoices and view payment history.
2. **Nav naming**
   - **Sales invoices** (`/invoices`) — invoices you issue; create/edit/send/record payment.
   - **Supplier invoices** (`/invoices/supplier`) — invoices from suppliers; view PDF + receipts only.
3. **In-place viewing** — Purchase orders and Incoming orders open `ViewInvoiceModal` for Invoice / Receipts. Optional “Open in Sales/Supplier invoices” for the full list. No forced navigation into record-payment for buyers.

## Failure states

| Case | Behavior |
|------|----------|
| Buyer `POST /invoices/{id}/payment` | 404 (not manage payments) |
| Buyer opens Receipts from PO | View-only receipts modal |
| Seller opens Receipts / Record payment | Can record when balance remains |

## Consequences

- Supersedes buyer-can-pay language in [2026-07-11-po-accept-auto-invoice.md](./2026-07-11-po-accept-auto-invoice.md).
- Buyers still need sales-module access for invoice APIs (unchanged).

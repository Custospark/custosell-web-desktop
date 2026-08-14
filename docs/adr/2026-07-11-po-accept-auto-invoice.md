# ADR: PO accept auto-creates shared B2B invoice

**Date:** 2026-07-11  
**Status:** Accepted  
**Modules:** Inventory (supply chain), Invoices / Payments

## Context

Businesses buy from and sell to each other on Custosell. After a seller accepts a purchase order, billing must happen through **Invoices** (not ad-hoc “generate invoice” buttons on the PO). The buyer must see the same invoice and its payment receipts.

## Decision

1. **Accept → invoice** - `POST /purchase-orders/{id}/accept` creates a seller-owned invoice (`business_id` = seller), links `purchase_order_id` + `buyer_business_id`, and **sends** it immediately (non-draft).
2. **Single invoice record** - Buyer sees it on `GET /invoices` as `direction: received`. Seller sees it as `issued`. Payments/receipts are the same morph payments on that invoice.
3. **Payments hub** - Record payment is **seller-only** (invoice owner). Buyers view supplier invoices and receipt history. PO/Incoming open invoices in-place via `ViewInvoiceModal`; optional nav to **Sales invoices** / **Supplier invoices**.
4. **Delete** - `DELETE /purchase-orders/{id}` allowed for **draft** (buyer only) and **rejected** / **cancelled** (buyer or seller). Hard delete (avoids `po_number` unique collisions). Linked invoices block delete.
5. **Action matrix** - Canonical UI matrix lives in [modules/inventory-supply-chain.md](../modules/inventory-supply-chain.md#action-matrix-purchase-orders--incoming-orders). Buyer never generates invoices from POs; seller never manually generates after fulfill; Accept creates the invoice; Fulfill = stock-out; Receive = stock-in.
6. **Seller-only payments** - See [2026-07-11-supplier-invoices-seller-payments.md](./2026-07-11-supplier-invoices-seller-payments.md).

## Failure states

| Case | Behavior |
|------|----------|
| Accept twice | Status guard; invoice idempotent on `purchase_order_id` |
| Delete accepted PO | 422 |
| Buyer opens received invoice edit/send/delete | Hidden in UI; API rejects non-owner mutate |
| Offline PO/invoice | Supply chain + invoice APIs remain online-only for this flow |

## Consequences

- ADR [2026-07-11-inventory-supply-chain-b2b.md](./2026-07-11-inventory-supply-chain-b2b.md) “payments off-platform” is superseded for PO-linked invoices: payments are on-platform via Invoices.
- Buyers need access to the Invoices screen (sales module) to manage/view PO invoices and receipts.

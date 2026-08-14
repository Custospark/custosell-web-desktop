# ADR: Buyer AP automation for shared supplier invoices

**Date:** 2026-07-11  
**Status:** Accepted  
**Modules:** Accounting, Invoices, Inventory (supply chain)

## Context

Shared B2B invoices are seller-owned (`business_id` = seller, `buyer_business_id` = buyer). Seller books already posted AR on send and cash/bank on payment. Buyer “Supplier invoices” were visibility-only - AP (`2101`) existed in the COA but automation never touched it.

## Decision

When `buyer_business_id` is set and differs from the seller:

1. **On invoice send** (`InvoiceSentForAccounting`) - buyer JE `supplier_invoice:{invoiceId}`:
   - Dr **Inventory 1104** (product lines) and/or **Operating expense 6101** (services)
   - Dr **VAT Payable 2102** for input VAT when `tax_total > 0` (until a dedicated VAT receivable exists)
   - Cr **Accounts Payable 2101** = `total_amount`
2. **On seller-recorded payment** (`PaymentRecordedForAccounting`) - buyer JE `supplier_invoice_payment:{paymentId}`:
   - Dr **AP 2101** / Cr **Cash 1101** or **Bank 1102** (same method mapping as seller)

Seller-only payment recording stays in force. Buyer settlement mirrors the seller’s payment event so books stay aligned without letting buyers POST payments.

Implementation: `SupplierInvoiceAccountingService`, called from `AccountForInvoiceSent` and `AccountForPaymentRecorded`. Soft idempotency via `getEntryByReference` + unique `(business_id, reference_type, reference_id)`.

## Failure states

| Case | Behavior |
|------|----------|
| No open period / missing COA on buyer | Logged; seller JE still attempted independently |
| Duplicate send/payment event | Soft skip if reference JE exists |
| Payment before buyer AP JE | Settlement skipped with warning (AP JE must exist first) |
| Non-B2B invoice (no `buyer_business_id`) | Buyer path no-ops |

## Consequences

- Buyer trial balance / BS now show AP and inventory/expense from marketplace POs.
- Stock **quantity** still updates on PO receive; GL inventory value posts on invoice send (timing can differ - GRNI clearing deferred).
- Supersedes “no buyer GL” gap noted under [2026-07-11-supplier-invoices-seller-payments.md](./2026-07-11-supplier-invoices-seller-payments.md).

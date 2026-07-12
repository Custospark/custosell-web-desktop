# ADR: Unified receipt action bar

- **Status:** Accepted
- **Date:** 2026-07-12

## Context

Sale completed, receipt preview, payment receipts, and legacy cart receipt views each arranged Download / Print / Share / Email differently, which felt inconsistent for buyers and cashiers.

## Decision

Use one shared `ReceiptActionBar` (`sales/ui/receipt/ReceiptActionBar.tsx`):

1. Primary row: **Download PDF** · **Print** · optional primary CTA (New sale / Done)
2. **More** overflow for secondary: Share, Email, View PDF, Invoice, Attachment, etc.

Adopted on:

| Surface | App page / entry |
|---------|------------------|
| Sale completed modal | POS New Sale → after checkout |
| Receipt preview modal | Discover **My Orders**; **My Shift** sale receipt; Sales History flows that open preview |
| Payment receipt modal | Invoice payment; Sale payments; Record payment success |
| Sale payments summary | Sales History → payment history → show sale summary |
| Legacy `ReceiptPreview` / `ReceiptView` | Kept aligned if re-enabled |

Discover My Orders **row** actions stay icon-only (Eye / Receipt / Invoice), separate from the receipt footer.

## Consequences

One layout to maintain; secondary actions no longer crowd the footer.

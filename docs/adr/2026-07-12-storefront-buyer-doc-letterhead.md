# ADR: Storefront buyer docs use shop letterhead

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Discover My Orders sale receipts + invoices (B2C)

## Context

Discover buyers open sale receipts (`ReceiptPreviewModal` → `ReceiptContent`) and invoices (`ViewInvoiceModal`) for shops they ordered from. Receipt letterhead preferred `auth.user.business` over `sale.business`, so:

- Pure buyers with no business fell through to the **CUSTOSELL** placeholder when `sale.business` was missing from the client path.
- Merchants shopping on Discover saw **their own** business name on another shop’s receipt.

Invoice `InvoiceResource` marked B2C invoices as `direction: issued` (buyer has `business_id = null`), so `party_name` was the **customer**, while the modal labeled the row **From** — wrong counterparty.

## Decision

1. **Receipt letterhead** always prefers `sale.business` (issuing shop), then auth business only as POS fallback. Never use **CUSTOSELL** as a fake shop name when a sale is shown — fallback label is **Shop**. Do not use the buyer’s phone as shop contact when `sale.business` is present.
2. **InvoiceResource** treats authenticated users with `business_id = 0` viewing a shop invoice as `direction: received`, so `party_name` / `seller_business` are the issuing shop.
3. **invoicePartyLabel(..., { asBuyer })** prefers `seller_business.name` whenever the UI is in buyer/received mode (covers merchants who own a business but open docs as `storefront_buyer`).
4. **Your carts** qty controls match Sales: circular red (−) / green (+), tap quantity to edit via shared `QuantityEditModal`.
5. **Buyer invoice PDF** via `GET /storefront/my-orders/{order}/invoice/pdf` — same `InvoicePdfBuilder` as seller downloads, letterhead = issuing shop. Discover modal View/Download uses this route (`storefrontOrderId`), not `/invoices/{id}/pdf`.

## Consequences

- Buyer-facing docs read as the merchant’s brand, not Custosell.
- POS seller receipts still work (`sale.business` loaded, or auth business fallback).
- Storefront buyers can view/download the shop’s invoice PDF without seller invoice list access.
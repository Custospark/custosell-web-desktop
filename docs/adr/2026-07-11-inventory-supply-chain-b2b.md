# ADR: Inventory & Supply Chain (B2B marketplace)

**Date:** 2026-07-11  
**Status:** Accepted  
**Module:** Inventory (`inventory` access key)

## Context

Businesses need a way to buy stock from other Custosell tenants without leaving the POS. POS **Orders** already mean held carts; B2B must not overload that language.

## Decision

1. **Rename** the sidebar group to **Inventory & Supply Chain** while keeping the module slug `inventory` (no staff-access migration).
2. **Opt-in catalog** — sellers set `is_open_for_supply` on the business and `listed_for_supply` (+ supply price / min qty) per product. Marketplace never exposes unlisted inventory.
3. **Purchase-order lifecycle** — `draft → submitted → accepted|rejected → fulfilled → received` (or `cancelled` from draft/submitted).
4. **Online only** — no IndexedDB / mutation-queue path. UI shows “Supply chain requires connection” when `systemStatus === 'offline'`.
5. **Payments off-platform for v1 notes** — superseded for PO-linked billing: accepting a PO auto-creates a shared invoice; payments/receipts live under Invoices (see [2026-07-11-po-accept-auto-invoice.md](./2026-07-11-po-accept-auto-invoice.md)).
6. **Stock effects** — seller fulfill → stock out (`sale` movement); buyer receive → map lines to local products → stock in (`purchase`). No silent catalog clone.
7. **Naming** — buyer UI: **Purchase orders**; seller UI: **Incoming orders**. Sales **Orders** unchanged.

## Routes (FE)

| Path | Page |
|------|------|
| `/inventory/marketplace` | Browse open suppliers + listed products; PO cart |
| `/inventory/purchase-orders` | Outbound POs |
| `/inventory/incoming-orders` | Inbound POs (seller actions) |

## API (BE, `module:inventory`)

- `GET /marketplace/businesses`, `GET /marketplace/businesses/{id}/products`
- `PATCH /businesses/supply-profile`, `PATCH /products/{id}/supply-listing`
- `GET|POST /purchase-orders`, submit/cancel/**delete**/accept/reject/fulfill/receive, `GET /purchase-orders/incoming`
- Accept creates and sends a seller invoice linked to the PO (`purchase_order_id`, `buyer_business_id`)

## Failure states

| Case | Behavior |
|------|----------|
| Offline browse/mutate | Blocked with banner |
| Fulfill oversell | 422; status stays `accepted` |
| Double fulfill / receive | Rejected by status guard |
| Cross-tenant IDOR | Endpoints assert buyer or seller `business_id` |
| Seller closes supply mid-PO | Existing POs continue; marketplace hides seller |

## Consequences

- Supply chain is unavailable offline by design (documented in offline inventory notes).
- Future split into a `supply_chain` module key is deferred until permissions need finer ACL.

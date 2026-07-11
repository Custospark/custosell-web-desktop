# Inventory & Supply Chain (B2B)

Online-only marketplace and purchase orders between businesses. See ADR [2026-07-11-inventory-supply-chain-b2b.md](../adr/2026-07-11-inventory-supply-chain-b2b.md), [2026-07-11-po-accept-auto-invoice.md](../adr/2026-07-11-po-accept-auto-invoice.md), and [2026-07-11-marketplace-supplier-list.md](../adr/2026-07-11-marketplace-supplier-list.md).

## FE layout

| Path | Role |
|------|------|
| `modules/inventory/MarketplacePage.tsx` | Immersive supplier browse → catalog → cart |
| `modules/inventory/ui/marketplace/` | Action strip, My suppliers + browse modals, catalog, cart sheet, theme |
| `modules/inventory/PurchaseOrdersPage.tsx` | Buyer outbound POs + receive + invoice/receipt deep-links |
| `modules/inventory/IncomingOrdersPage.tsx` | Seller accept / reject / fulfill + invoice/receipt deep-links |
| `modules/inventory/api/marketplace/` | Marketplace + supplier-list queries/mutations |
| `modules/inventory/api/purchaseOrders/` | PO queries + mutations |
| `modules/inventory/ui/supply/buyerPoActions.tsx` | Buyer status → CTA matrix |
| `modules/inventory/ui/supply/sellerPoActions.tsx` | Seller status → CTA matrix |
| `modules/inventory/ui/supply/` | Offline banner, listing UI, receive / reject / view modals |
| `modules/invoices/` | Shared issued + received invoices; payments & receipts |

## Seller setup

1. Business settings → **Open for supply** + optional headline (`PATCH /businesses/supply-profile`).
2. Product edit → **List for supply** with supply price / min qty (`PATCH /products/{id}/supply-listing`).

## Buyer flow

1. **Marketplace** → **My suppliers** (saved shortlist) or **Browse** (all open-for-supply) → open catalog → add lines to cart → draft or submit PO.
2. In Browse, bookmark a supplier to save it; remove from My suppliers or un-bookmark in Browse.
3. Purchase orders → submit / cancel; **delete** draft, rejected, or cancelled.
4. After seller accepts → invoice appears under **Invoices** (Received). Open Invoice / Receipts from the PO row.
5. After seller fulfills → **Receive** and map each line to a local product.

### Marketplace UX (pipeline-inspired)

- Full-bleed workspace with external hero image + glass header/footer (same language as board workspaces).
- Bottom strip: **My suppliers** · **Browse** · **Cart** · **Orders** · **Refresh**.
- Supplier selection happens in large (`2xl`) search modals; products appear only after a supplier is chosen.
- **Cart docks beside the catalog** on desktop so shoppers can keep adding lines; mobile uses a side sheet with **Keep shopping**. Draft / Submit sit in one row; cart lines are searchable and chunk-rendered for large orders.

### Scale notes (display)

- Current UI is built for **realistic B2B carts and per-seller catalogs** (tens–thousands), not millions of DOM rows.
- Catalog and cart use **chunked render + client filter**; supplier browse still loads the open-for-supply list then filters locally.
- Millions of records would need **server pagination / search** (and ideally virtualized lists) — not the current full-array `.map()` path.

### Supplier list APIs

- `GET /marketplace/suppliers`, `POST /marketplace/suppliers`, `DELETE /marketplace/suppliers/{sellerBusinessId}`
- Browse payload includes `is_saved` + `listed_products_count`

## Seller flow

1. Incoming orders → accept or reject (reason required).
2. **Accept** auto-creates and sends an invoice for the buyer (manage payments under Invoices).
3. Fulfill deducts stock. Insufficient stock returns 422.
4. **Delete** rejected or cancelled orders from the list.

---

## Action matrix (Purchase orders & Incoming orders)

Lifecycle: `draft → submitted → accepted|rejected → fulfilled → received` (or `cancelled` from draft/submitted).

Billing rule: **Accept creates the invoice.** Payments and receipts are managed only under **Invoices** — PO screens deep-link there (`?po=&invoice=&focus=payments`).

### Buyer — Purchase orders (`/inventory/purchase-orders`)

| Status | Allowed actions | Notes |
|--------|-----------------|-------|
| **draft** | View, Edit, Submit, **Delete** | Seller cannot see the PO until submit. Delete is permanent. |
| **submitted** | View, Cancel | Waiting on seller. Cancel → `cancelled` (not delete). |
| **accepted** | View, **Invoice**, **Receipts** | Seller invoice already exists. Open Invoices to pay / view receipts. |
| **fulfilled** | View, **Receive**, Invoice, Receipts | Receive maps each line to a local product → stock in. |
| **received** | View, Invoice, Receipts | Stock already in. Payment continues under Invoices. |
| **rejected** | View, **Delete** | Review rejection reason, then remove from list. |
| **cancelled** | View, **Delete** | Terminal on the order flow; delete to clean up. |

### Seller — Incoming orders (`/inventory/incoming-orders`)

| Status | Allowed actions | Notes |
|--------|-----------------|-------|
| **draft** | — | Hidden from seller (buyer still composing). |
| **submitted** | View, **Accept**, **Reject** | Accept → status `accepted` **and** auto-creates/sends invoice for buyer. Reject requires a reason. |
| **accepted** | View, **Fulfill**, Invoice, Receipts | Fulfill deducts seller stock (`sale` movement). Manage payment under Invoices. |
| **fulfilled** | View, Invoice, Receipts | Waiting for buyer receive. |
| **received** | View, Invoice, Receipts | Order complete on the goods side; payment may still be open. |
| **rejected** | View, **Delete** | Clean up rejected inbound POs. |
| **cancelled** | View, **Delete** | Buyer cancelled; seller can remove from Incoming. |

### What each action means

| Action | Who | API | Effect |
|--------|-----|-----|--------|
| Submit | Buyer | `POST /purchase-orders/{id}/submit` | `draft` → `submitted`; seller sees it under Incoming. |
| Cancel | Buyer | `POST /purchase-orders/{id}/cancel` | `draft`/`submitted` → `cancelled`. |
| Delete | Buyer or seller | `DELETE /purchase-orders/{id}` | Hard-delete **draft** (buyer only) or **rejected** / **cancelled** (either). Blocked if an invoice is linked. |
| Accept | Seller | `POST /purchase-orders/{id}/accept` | `submitted` → `accepted`; creates + sends seller invoice (`purchase_order_id`, `buyer_business_id`). |
| Reject | Seller | `POST /purchase-orders/{id}/reject` | `submitted` → `rejected` with reason. |
| Fulfill | Seller | `POST /purchase-orders/{id}/fulfill` | `accepted` → `fulfilled`; stock out. 422 if insufficient stock. |
| Receive | Buyer | `POST /purchase-orders/{id}/receive` | `fulfilled` → `received`; stock in after local product mapping. |
| Invoice | Both | Navigate to Invoices | Opens linked invoice (`?invoice=&po=`). |
| Receipts | Both | Navigate to Invoices | Opens payment history / receipts (`?focus=payments`). |

### Explicitly not available on PO screens

- Buyer must **not** generate their own invoice from a PO.
- Seller must **not** manually “Generate invoice” after fulfill — Accept already created it.
- Payments are **not** recorded on the PO page — only under Invoices.

---

## Offline

All marketplace/PO queries and mutations use `networkMode: 'online'`. Pages render `SupplyOfflineBanner` when completely offline. List load failures show a Retry empty state (not a blank “no orders” screen).

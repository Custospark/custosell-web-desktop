# ADR: Persist POS Orders to Database

**Date:** 2026-07-11  
**Status:** Accepted  
**Owners:** Sage / Blue / Rex / Quill

## Context

POS “Hold Order” previously stored carts in `localStorage` (`heldOrders`). That blocked multi-device resume, lost discount/notes fidelity, and could not participate in sale/invoice lifecycle or offline sync.

## Decision

Persisted **Orders** domain with lifecycle:

`open` → `completed` (sale created with `order_id`) → `invoiced` (invoice created from that sale) | `cancelled`

| Rule | Behavior |
|------|----------|
| Hold / Update | `POST /orders` or `PUT /orders/{id}` from cart snapshot; clear cart |
| Take / Resume | Load cart + set `activeOrderId`; order stays **open** |
| Complete sale | `CreateSalePayload.order_id` → server marks order `completed` |
| Invoice from sale | When invoice has `sale_id` and sale has `order_id` → order `invoiced` |
| Cart “Generate Invoice” without sale | Does **not** complete an order |
| Take modal | Open orders only |
| Orders page (`/sales/orders`) | All statuses + filters |

## Frontend

- Module: `modules/sales/api/orders/` (types, keys, queries)
- Redux: `activeOrderId` replaces `heldOrders` localStorage
- Offline: `localOrders` IDB store (schema v13), mutation queue before sales, order_id remap on sales
- One-time migration: `migrateHeldOrdersFromLocalStorage` pushes legacy holds then clears the key
- **Rename on Orders page:** uses shared `Modal` (`RenameOrderModal`) — not `window.prompt`. Same field as Hold Order (`customer_name`); empty → `Guest`. Save closes modal on success; Cancel / Escape discard. Failure stays in modal (toast from `useUpdateOrder`).

## Backend

- Tables: `orders`, `order_items`; `sales.order_id` unique nullable FK; `orders.sale_id`
- API: `routes/api/v1/orders.php` under `module:sales`
- `SaleService` / `InvoiceService` complete and mark invoiced

## Consequences

- Held carts survive logout/device when synced
- Double-complete of the same open order is rejected (422)
- Offline holds appear optimistically; sync remaps negative ids before dependent sales

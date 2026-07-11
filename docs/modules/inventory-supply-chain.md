# Inventory & Supply Chain (B2B)

Online-only marketplace and purchase orders between businesses. See ADR [2026-07-11-inventory-supply-chain-b2b.md](../adr/2026-07-11-inventory-supply-chain-b2b.md).

## FE layout

| Path | Role |
|------|------|
| `modules/inventory/MarketplacePage.tsx` | Supplier browse + PO cart |
| `modules/inventory/PurchaseOrdersPage.tsx` | Buyer outbound POs + receive |
| `modules/inventory/IncomingOrdersPage.tsx` | Seller accept / reject / fulfill |
| `modules/inventory/api/marketplace/` | Marketplace queries |
| `modules/inventory/api/purchaseOrders/` | PO queries + mutations |
| `modules/inventory/ui/supply/` | Offline banner, listing UI, receive modal |

## Seller setup

1. Business settings → **Open for supply** + optional headline (`PATCH /businesses/supply-profile`).
2. Product edit → **List for supply** with supply price / min qty (`PATCH /products/{id}/supply-listing`).

## Buyer flow

1. Marketplace → add listed lines to cart (one seller at a time) → draft or submit PO.
2. Purchase orders → submit / cancel; after seller fulfills → **Receive** and map each line to a local product.

## Seller flow

1. Incoming orders → accept or reject (reason required).
2. Accept → fulfill (deducts stock). Insufficient stock returns 422.

## Offline

All marketplace/PO queries and mutations use `networkMode: 'online'`. Pages render `SupplyOfflineBanner` when completely offline.

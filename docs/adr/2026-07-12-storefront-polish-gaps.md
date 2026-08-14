# ADR: Storefront polish - categories, stock, cancel, QR, delivery

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Discover + My Orders + Public shop + Sales Orders (online filter)

## Decision

1. Discover Products: category chips from `GET /storefront/categories`; infinite query keyed by category.
2. Sales → Orders: **Online** toggle + open-online alert banner (`source=storefront`).
3. Buyer: `POST …/my-orders/{id}/cancel` (open), `DELETE …/my-orders/{id}` (cancelled only).
4. Public products: `stock_quantity` / `in_stock` / `availability`; FE badges; soft reject OOS on place-order.
5. Discover / My Orders registered in `onlineOnlyNav`.
6. Product detail modal; self-hosted QR via `qrcode` (no api.qrserver.com).
7. Delivery `delivery_address` / `delivery_city` on orders; Public shop card shows logo + link to Business settings.
8. Buyer email + in-app notify on storefront complete/invoice (no push, no MoMo).

## Out of scope

MoMo/card, push, SEO/OG, hard stock reservation.

# ADR: Per-business supplier list (My suppliers)

**Date:** 2026-07-11  
**Status:** Accepted  
**Module:** Inventory (`inventory` access key)

## Context

Marketplace browse lists every business open for supply. Buyers who reorder from the same wholesalers need a shortlist so they can open catalogs without re-searching each time.

## Decision

1. Persist a **buyer → seller** shortlist in `business_supplier_list` (`buyer_business_id`, `seller_business_id`, optional `notes`, unique pair).
2. APIs (auth + `module:inventory`):
   - `GET /marketplace/suppliers` — saved suppliers (searchable via `q`)
   - `POST /marketplace/suppliers` — `{ seller_business_id, notes? }` (seller must be open for supply; cannot save self)
   - `DELETE /marketplace/suppliers/{sellerBusinessId}`
3. Annotate `GET /marketplace/businesses` with `is_saved`, `listed_products_count`, and `is_open_for_supply` so Browse can show bookmark state without a second round-trip.
4. Frontend: **My suppliers** modal + bookmark on Browse; selecting either opens the same catalog → cart flow. Online-only (same as marketplace).

## Failure states

| Case | Behavior |
|------|----------|
| Offline save/remove | Mutations blocked (`networkMode: 'online'`); UI disabled when completely offline |
| Save self / closed seller | 422 with field message |
| Remove missing entry | 422 |
| Seller closes supply later | Entry may remain on list; catalog products empty / seller hidden from Browse; buyer can remove manually |
| Duplicate save | Idempotent `firstOrCreate` |

## Consequences

- Supplier list is tenant-scoped and cascades with business delete.
- Does not create customers, POs, or invoices by itself — only a bookmark into marketplace browse.

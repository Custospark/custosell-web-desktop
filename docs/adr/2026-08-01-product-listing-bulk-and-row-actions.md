# ADR: Product bulk list/unlist actions + per-row Actions menu

**Date:** 2026-08-01
**Status:** Accepted

**Context:** New products default to listed (supply + storefront) on the backend, but the product table only offered listing toggles via individual row icons, and the bulk action bar only supported Delete. There was no way to (re)list a batch of unlisted products, and the growing set of per-row actions was crowding the table rows.

**Decision:**
- **Bulk bar**: added four bulk actions above the existing Delete - List on public shop, Unlist on public shop, List for supply, Unlist for supply - driven by `BULK_LISTING_ACTIONS` in `ProductList.tsx` and the new `useBulkUpdateListing()` hook (`POST /products/bulk-listing` with `{ ids, channel, listed }`).
- **Per-row Actions menu**: new `ProductRowActions.tsx` - a `MoreVertical` dropdown (outside-click/Escape close) replacing the old inline icon row. Items: View history, Edit, Adjust stock (hidden for services and pending-sync products), List/Unlist on public shop, List/Unlist for supply (hidden for services; disabled while offline), Delete.
- Menus reuse the existing `useUpdateSupplyListing` / `useUpdateStorefrontListing` mutations with mirror payloads.
- `useBulkUpdateListing` is **online-only** (`networkMode: 'online'`), same as bulk-delete - no offline queueing. On success it invalidates `inventoryKeys.products()` and refreshes the offline product catalog snapshot so the desktop POS catalog stays in sync.
- Removed the now-unused row icons (`Eye`, `Pencil`, `Trash`, `PackagePlus`, `tracksStock`).

**Consequences:**
- Users can list/unlist any selection (or row) for either channel in two clicks; no hunting through row icons.
- Actions column stays clean as more per-product actions are added later.
- Offline, row actions degrade gracefully: supply actions hidden for services, all listing mutations disabled with the existing offline styling.
- `ProductList.tsx` grew but stays under the 500-line Vera limit.

**Files:**
- `src/renderer/modules/inventory/api/products/ProductListingQueries.ts` (new - `useBulkUpdateListing`)
- `src/renderer/modules/inventory/ui/products/ProductRowActions.tsx` (new - row Actions dropdown)
- `src/renderer/modules/inventory/ui/products/ProductList.tsx` (bulk bar actions + Actions column)
- `src/renderer/shared/api/endpoints/endpoints.ts` (`PRODUCTS.BULK_LISTING`)

**Verification:** `npm run vera:fast` (eslint + logic) ✅ · `npx tsc --noEmit` ✅

# ADR — Business-scope all offline local stores & stock ledger (DB v15)

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend only. Backend already scopes every API resource by `business_id`; no server change required.

## Context

The offline store (`CustosellOffline`, IndexedDB) lives in a **single shared database** on each device. DB v14 business-scoped the **mutation queue** (`QueuedMutation.businessId` + `getPending()` filter) and the durable id maps, so the generic sync/drain path was already confined to the active business.

However, an audit found the **local record stores and the stock ledger were not business-scoped**:

- Every per-domain local store (`localProducts`, `localSales`, `localCustomers`, `localExpenses`, `localOrders`, `localRefunds`, `localShifts`, `localCategories`, `localRoles`, `localStaff`, `localExpenseCategories`, `localGuideFeedback`, `localBusinessSettings`) persisted **no `businessId`** and its `getAll`/`getPending` returned **every business's** records. The UI read/overlay paths merged these unscoped pending sets, so a user in business B could see business A's pending offline creates/updates.
- The **stock ledger** was the worst: the `stock` store was keyed by `productId` only (no businessId), `adjustments` had no businessId, `getPendingAdjustments()` returned all businesses' adjustments, and `syncStock.processStockAdjustments()` posted them under the **currently active session** — a real "stock syncs to the wrong business" risk when users of different businesses share a machine.

## Decision

Add business scoping across the whole offline local layer, so no work entered for one business can leak into another on a shared device:

1. **DB v15** (`offlineDb.ts`): add a `businessId` index to every business-scoped store; re-key the `stock` store to a composite `['businessId','productId']` key (a keyPath cannot change in place, so it is recreated — it is re-seeded from the server catalog on next sync). Legacy records are backfilled with `businessId` from the row's own `business_id` (products/shifts) or from the linked mutation's `businessId`.
2. **Stock ledger** (`stockLedger.ts`): every entry and adjustment now carries `businessId` (from `getActiveBusinessId()`); `get`/`set`/`adjust`/`batchAdjust`/`getAll` read/write by composite `[businessId, productId]`; `getPendingAdjustments()` filters by the active business. Because `syncStock` drains through this now-scoped method, stock adjustments can no longer be posted to a foreign business's session.
3. **Per-domain local stores** (13 files): each record interface gains `businessId?: number`, set at save from `getActiveBusinessId()`; `getAll()`/`getPending()` are filtered through a shared `scopedStore` helper (`core/businessScoping.ts`) using the active business. Methods keyed by globally-unique `mutationId`/`localId` (markSynced/removeByMutationId etc.) are intentionally left unfiltered.
4. **Read/overlay paths** (sales, products, customers, expenses) call the now-scoped `getPending()`, so the UI only ever overlays the active business's pending records.

## Why frontend-only

The server is already the source of truth and scopes by `business_id`. The leak was entirely in the shared client DB's read/display and the stock drain path. `getActiveBusinessId()` reads the same auth state the mutation queue uses, keeping every layer consistent.

## Consequences

- No cross-business visibility or sync leak: stock, products, sales, customers, expenses, orders, refunds, shifts, categories, roles, staff, and settings pending records are all confined to the active business.
- The `stock` store is re-seeded from the server catalog after the v15 upgrade (existing local stock quantities are restored on next sync).
- Gates: FE `npm run vera:fast` passed; `npx tsc --noEmit` clean; `npx vitest run` 23/23 passed.

## References

- `src/renderer/app/store/offline/core/offlineDb.ts` (DB v15 migration)
- `src/renderer/app/store/offline/core/businessScoping.ts` (shared scoped-store helper)
- `src/renderer/app/store/offline/inventory/stockLedger.ts`
- 13 per-domain local record stores (products, sales, customers, expenses, orders, refunds, shifts, categories, roles, staff, expense categories, guide feedback, business settings)
- `src/renderer/app/store/offline/sync/syncStock.ts`
- Prior scoping: `docs/adr/2026-08-11-offline-sync-durable-id-maps-dependency-guard.md` (DB v14, mutation queue + id maps)

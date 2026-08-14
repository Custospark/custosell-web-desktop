# Offline sales architecture

Sales, shifts, and refunds use **write-local, read-merged** with durable **sales catalog snapshots** for history after logout.

Related: [architecture.md](./architecture.md) · [auth.md](./auth.md)

## Overview

- Writes persist to IndexedDB immediately and merge into React Query for instant UI.
- Server list responses backup to `serverCatalogs` (sales entity).
- Sync runs in background on reconnect via `syncCoordinator`.

## IndexedDB stores (sales-related)

Part of `CustosellOffline` v13 - see [architecture.md](./architecture.md).

| Store | Purpose |
|-------|---------|
| `localSales` | Full sale records pending server sync |
| `localOrders` | Held/open orders pending create/update/cancel sync |
| `localRefunds` | Refund snapshots pending server sync |
| `localShifts` | Shift open/close records pending server sync |
| `mutations` | Outbound API mutation queue |
| `stock` | Local stock quantity overrides |
| `adjustments` | Pending stock movement sync (non-sale only) |
| `serverCatalogs` | Sales list / shift / daily snapshots |

## Sales catalog snapshots

Module: `offline/catalogs/salesCatalogSnapshot.ts`

| Kind | Key pattern | Source API |
|------|-------------|------------|
| Full history | `sales:{businessId}:list` | `GET /sales` |
| Shift-scoped | `sales:{businessId}:shift:{shiftId}` | `GET /sales/by-shift/:id` |
| Daily | `sales:{businessId}:daily:{YYYY-MM-DD}` | `GET /sales/daily` |

Daily reads fall back to filtering the `:list` snapshot when no daily key exists.

### Read order (sales list / shift / detail)

1. React Query cache
2. IDB sales snapshot (`loadSalesListBaseline`, `loadShiftSalesBaseline`, `loadDailySalesBaseline`)
3. Pending `localSalesStore` rows
4. Pending refund overlay (`localRefundsStore` + `mergePendingRefunds`)

Wired in `salesQueries.ts` and `ShiftQueries.ts` (`readShiftSalesBaseline`).

### Refresh

- On successful server GET → `backupSalesListSnapshot` / `backupShiftSalesSnapshot` / `backupDailySalesSnapshot`
- On login/sync → `refreshSalesCatalogSnapshotsForSession()` (list + active shift)
- Included in `refreshAllServerCatalogSnapshots()`

## Key modules

| Path | Role |
|------|------|
| `offline/sales/localSalesStore.ts` | CRUD for offline sale records |
| `offline/sales/localRefundsStore.ts` | CRUD for offline refund records |
| `offline/sales/localShiftsStore.ts` | CRUD for offline shift records |
| `offline/sales/completeOfflineSale.ts` | Instant offline sale completion |
| `offline/sales/completeOfflineRefund.ts` | Instant offline refund completion |
| `offline/sales/completeOfflineShift.ts` | Instant offline clock-in/out |
| `offline/sales/offlineSalesSummary.ts` | Dashboard/shift totals from pending sales |
| `offline/inventory/offlineStockOverlay.ts` | Merges ledger stock into product list |
| `offline/sync/syncEngine.ts` / `offline/sales/syncSalesBatch.ts` | Ordered sync on reconnect |
| `modules/sales/api/salesQueries.ts` | Hybrid fetch + optimistic updates + snapshots |
| `modules/shifts/ShiftQueries.ts` | Hybrid shift fetch + shift sales snapshots |

## Sale completion flow (offline)

1. `useCreateSale` → `completeOfflineSaleInstant()` when completely offline (or network failure on POST)
2. Stock deduction via `stockLedger.batchAdjust()` (seeded from product cache / IDB catalog)
3. Enqueue mutation + save to `localSalesStore`
4. Optimistic `setQueryData` on sales, products, dashboard, shift caches
5. UI: `OFF-*` receipt + **Pending sync** badge

Online/slow path: tries `POST /sales` (4s timeout) first; falls back to local on network failure only.

## Held orders (offline)

1. Hold → `POST /orders` (or local `completeOfflineCreateOrderInstant` when offline)
2. Resume keeps order `open` and sets Redux `activeOrderId`
3. Offline sale payload includes `order_id`; sync creates orders **before** sales and remaps negative ids
4. Legacy `localStorage.heldOrders` migrates once via `migrateHeldOrdersFromLocalStorage` on online sync

See ADR: [pos-orders-persistence](../adr/2026-07-11-pos-orders-persistence.md).

## Refund flow (offline)

1. Only **synced** sales (positive server IDs) can be refunded offline
2. `useRefund` → `completeOfflineRefundInstant()` when offline or network failure
3. Restores stock locally (`reason: 'refund'`)
4. Enqueues `POST /sales/:id/refund` + `localRefundsStore`
5. **Refund pending** badge until sync

Unsynced `OFF-*` sales must sync before refunding.

## Shift flow (offline)

1. **Clock in** → `completeOfflineClockInInstant()` - negative shift ID, auth `shift_id` updated, `POST /shifts` queued
2. Offline sales attach `shift_id` from auth slice
3. **Clock out** → totals from merged shift sales, `PUT /shifts/:id` queued, auth cleared
4. **Shift pending sync** badge when local-only

After session upgrade, `refreshActiveShiftFromServer()` aligns auth with `GET /shifts/active`.

### Shift limitations

- Shift **list** is not catalog-snapshotted (RQ + `localShiftsStore` + auth fallback only)
- Shift sales snapshot refreshed for **active shift** on login/sync; closed shifts depend on prior online visit or full list snapshot
- Negative shift IDs: no server shift snapshot until sync remaps ID

## Connectivity standard

| Status | Meaning |
|--------|---------|
| `offline` | Completely offline - local queue, instant sale completion |
| `slow` | API reachable - **server-first** (not offline) |
| `online` | Normal |

See [architecture.md](./architecture.md).

## Reconnect pipeline

1. `upgradeLocalSessionIfOnline()` - silent auth upgrade ([auth.md](./auth.md))
2. `syncPendingDataIfOnline()` → coordinator
3. Auth tier → shift opens → sales batch → refunds → shift closes → stock adjustments
4. `invalidateAfterFullSync()` + catalog snapshot refresh
5. `purgeSyncedOptimisticFromCache()` - remove `OFF-*` / pending badges

### Sync order (mutations)

1. Shift opens (`POST /shifts`) - remaps local shift IDs on sales, expenses, auth
2. Sales batch (`POST /sales/batch`)
3. Refunds (`POST /sales/:id/refund`)
4. Shift closes (`PUT /shifts/:id`)
5. Stock adjustments (non-sale)

## Post-sync cleanup

1. Synced rows deleted from `localSales`, `localRefunds`, `localShifts`, `mutations`
2. Optimistic cache purge
3. Server refetch - UI matches online state

Dashboard uses **server baseline** (`dashboardKeys.server`) + pending overlay - no double-counting.

## Net sales accounting

| Scope | Included | Net headline |
|-------|----------|--------------|
| Dashboard / trend | Business + calendar date | Gross − refunds − expenses |
| My Shift | Matching `shift_id` | Gross − refunds |
| Cash handover | Shift cash − shift expenses | Physical cash only |

See `shared/utils/accounting.ts` and dashboard field docs in prior sections.

## UI indicators

- Red **offline** banner above layout (dismissible)
- Amber hints on New Sale, Refunds, My Shift
- **Pending sync** - unsynced sales/products/etc.
- **Refund pending** - unsynced refunds
- **Shift pending sync** - local shift
- Receipt prefix `OFF-YYMMDD-XXXXXX`

Global banner placement: [../app/shell.md](../app/shell.md).

## Offline-first sales screens

Sales routes (`New Sale`, `History`, `Refunds`, `My Shift`) are **eagerly bundled** for offline chunk loading.

Sales and shift queries use `networkMode: 'always'` so mutations are not paused when offline.

## Manual test: logout → offline login → sales history

1. Sign in online; open Sales History (+ My Shift if clocked in).
2. Log out → offline → sign in with device credentials.
3. Sales History shows `sales:{businessId}:list` snapshot.
4. My Shift shows `sales:{businessId}:shift:{shiftId}` when snapshotted online.
5. New offline sales merge from `localSalesStore`.

Full test matrix: [testing.md](./testing.md).

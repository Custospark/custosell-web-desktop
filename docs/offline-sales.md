# Offline Sales Architecture

## Overview

Offline sales use a **write-local, read-merged** pattern. Sales, refunds, and shift clock-in/out are persisted to IndexedDB immediately and merged into React Query caches for instant UI updates. Sync happens in the background when connectivity returns.

## IndexedDB (`CustosellOffline` v5)

| Store | Purpose |
|-------|---------|
| `localSales` | Full sale records pending server sync |
| `localRefunds` | Refund snapshots pending server sync |
| `localShifts` | Shift open/close records pending server sync |
| `mutations` | Outbound API mutation queue |
| `stock` | Local stock quantity overrides |
| `adjustments` | Pending stock movement sync (non-sale only) |

## Key modules

| File | Role |
|------|------|
| `offlineDb.ts` | Shared DB connection and schema upgrades |
| `localSalesStore.ts` | CRUD for offline sale records |
| `localRefundsStore.ts` | CRUD for offline refund records |
| `localShiftsStore.ts` | CRUD for offline shift records |
| `completeOfflineSale.ts` | Instant offline sale completion |
| `completeOfflineRefund.ts` | Instant offline refund completion |
| `completeOfflineShift.ts` | Instant offline clock-in/out |
| `offlineSalesSummary.ts` | Derives dashboard/shift totals from pending sales |
| `offlineStockOverlay.ts` | Merges ledger stock into product list |
| `syncEngine.ts` | Ordered sync on reconnect |
| `salesQueries.ts` | Hybrid fetch + optimistic updates |
| `ShiftQueries.ts` | Hybrid shift fetch + offline mutations |

## Sale completion flow (offline)

1. `useCreateSale` → `completeOfflineSaleInstant()`
2. Batch stock deduction via `stockLedger.batchAdjust()` (seeded from product cache)
3. Enqueue mutation + save to `localSalesStore`
4. Optimistic `setQueryData` on sales, products, dashboard, shift caches
5. UI shows sale immediately with `OFF-*` receipt and "Pending sync" badge

## Refund flow (offline)

1. Only **synced** sales (positive server IDs) can be refunded offline
2. `useRefund` → `completeOfflineRefundInstant()` when offline or network failure
3. Restores stock locally (`reason: 'refund'`)
4. Enqueues `POST /sales/:id/refund` + saves to `localRefundsStore`
5. UI shows updated payment status with "Refund pending" badge

Unsynced `OFF-*` sales must sync before refunding.

## Shift flow (offline)

1. **Clock in** → `completeOfflineClockInInstant()` — local negative shift ID, auth `shift_id` updated, queued `POST /shifts`
2. **Offline sales** attach `shift_id` from auth (existing flow)
3. **Clock out** → `completeOfflineClockOutInstant()` — totals computed from merged shift sales, queued `PUT /shifts/:id`, auth cleared
4. "Shift pending sync" badge when shift is local-only

## Connectivity standard

| Status | Meaning |
|--------|---------|
| `offline` | **Completely offline** — local queue, client storage, offline UI |
| `slow` | API reachable but high latency — **not offline**, server-first |
| `online` | Normal connectivity |

Only `systemStatus === 'offline'` (or `navigator.onLine === false`) counts as offline.

## Reconnect sync order

1. Browser `online` event → optimistic `online` status + immediate queue drain
2. While offline, connectivity is re-probed every **3s** (30s when reachable)
3. `useOfflineSync` runs the moment status leaves `offline`
4. `syncPendingDataIfOnline()` → ordered mutation sync
3. `syncAllMutations()` in order:
   - Shift opens (`POST /shifts`) — remaps local shift IDs on sales + auth
   - Sales batch (`POST /sales/batch`)
   - Refunds (`POST /sales/:id/refund`)
   - Shift closes (`PUT /shifts/:id`)
4. Stock adjustments (refunds, non-sale) via `processStockAdjustments()`
5. Invalidate sales, dashboard, shift, and inventory queries

## Post-sync cleanup

After a successful queue drain:

1. Synced rows are **deleted** from `localSales`, `localRefunds`, `localShifts`, and `mutations`
2. `purgeSyncedOptimisticFromCache()` strips `OFF-*` / pending badges from React Query
3. Server data is refetched — UI matches online experience with no stale pending rows

Dashboard uses a **server baseline** (`dashboardKeys.server`) plus a fresh pending overlay on each read — never double-counts synced sales.

## UI indicators

- Red offline banner above layout (dismissible — persisted in localStorage)
- Amber offline hints on New Sale, Refunds, and My Shift
- `Pending sync` badge — unsynced sales
- `Refund pending` badge — unsynced refunds
- `Shift pending sync` badge — local shift not yet on server
- Receipt prefix `OFF-YYMMDD-XXXXXX` for local receipts

## Offline-first sales screens

Sales routes (`New Sale`, `History`, `Refunds`, `My Shift`) are **eagerly bundled** so they load without fetching extra JS chunks offline.

Sales and shift queries use `networkMode: 'always'` so mutations are not paused when offline.

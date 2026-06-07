# Offline Sales Architecture

## Overview

Offline sales use a **write-local, read-merged** pattern. Sales are persisted to IndexedDB immediately and merged into React Query caches for instant UI updates. Sync happens in the background when connectivity returns.

## IndexedDB (`CustosellOffline` v4)

| Store | Purpose |
|-------|---------|
| `localSales` | Full sale records pending server sync |
| `mutations` | Outbound API mutation queue |
| `stock` | Local stock quantity overrides |
| `adjustments` | Pending stock movement sync (non-sale only) |

## Key modules

| File | Role |
|------|------|
| `offlineDb.ts` | Shared DB connection and schema upgrades |
| `localSalesStore.ts` | CRUD for offline sale records |
| `offlineSalesSummary.ts` | Derives dashboard/shift totals from pending sales |
| `offlineStockOverlay.ts` | Merges ledger stock into product list |
| `syncEngine.ts` | Batch sync on reconnect |
| `salesQueries.ts` | Hybrid fetch + optimistic updates |

## Sale completion flow (offline)

1. `useCreateSale` → `createLocalSale()`
2. Batch stock deduction via `stockLedger.batchAdjust()` (seeded from product cache)
3. Enqueue mutation + save to `localSalesStore`
4. Optimistic `setQueryData` on sales, products, dashboard, shift caches
5. UI shows sale immediately with `OFF-*` receipt and "Pending sync" badge

## Reconnect flow

1. `useOfflineSync` detects online status
2. `syncAllMutations()` → `POST /sales/batch`
3. Mark local sales synced; skip sale-related stock adjustments (server handles stock)
4. Invalidate sales, dashboard, shift, and inventory queries

## UI indicators

- Amber banner on POS when offline
- `Pending sync` badge on Sales History for unsynced receipts
- Receipt prefix `OFF-YYMMDD-XXXXXX` for local receipts

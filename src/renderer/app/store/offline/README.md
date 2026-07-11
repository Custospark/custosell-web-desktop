# Offline store layout

IndexedDB-backed offline layer, grouped by **domain** (mirrors `src/renderer/modules/`). When something breaks, start in the folder that matches the feature.

```
offline/
├── core/           Shared DB, read strategy, connectivity helpers, ID remap
├── auth/           Login, device credentials, session upgrade, auth sync
├── sales/          Sales, refunds, shifts, receipts, sales batch sync
├── inventory/      Products, categories, stock ledger, stock overlay
├── customers/      Customer pending records + offline create
├── expenses/       Expenses + expense categories offline
├── settings/       Roles, staff, business settings offline
├── catalogs/       Durable server list snapshots (IDB serverCatalogs)
├── sync/           Mutation queue, coordinator, engine, cache reconcile
├── guide/          Guide feedback offline queue
└── testing/        Manual test quick reference
```

## Folder guide

| Folder | When to look here |
|--------|-------------------|
| **core** | DB open errors, `readWithOfflineStrategy`, offline vs slow detection, business ID remap |
| **auth** | Offline login, silent session upgrade, 401 on reconnect, `pendingAuthSync` |
| **sales** | `OFF-*` receipts, pending sales/refunds/orders, shift clock-in/out, shift/order ID remap |
| **inventory** | Product/category pending rows, stock ledger, failed product sync |
| **customers** | Customer pending CRUD |
| **expenses** | Expense/receipt upload queue, category remap |
| **settings** | Role/staff/business pending mutations, staff duplicate reconcile |
| **catalogs** | Logout → offline login empty lists, snapshot refresh |
| **sync** | Reconnect sync order, coordinator progress, mutation queue drain |
| **guide** | Offline guide feedback submissions |

## Import paths

Use the module path, not a flat file name:

```ts
// Sales
import { localSalesStore } from '@/app/store/offline/sales/localSalesStore';
// or relative from modules:
import { completeOfflineSale } from '../../../app/store/offline/sales/completeOfflineSale';

// Core utilities (used everywhere)
import { isOfflineMode } from '../../../app/store/offline/core/offlineQueryUtils';

// Sync coordinator
import { syncPendingDataIfOnline } from '../../../app/store/offline/sync/syncPendingIfOnline';
```

## Cross-module rules

- **sync/** imports from all domain folders — it is the only “orchestrator” module.
- **catalogs/** imports **inventory** `stockLedger` for seeding; **auth** `resolveAuthBusinessId` lives in catalogs utils.
- **auth/sessionRefresh** imports catalogs refresh + sales/shift query keys — post-upgrade refresh.
- Domain folders should **not** import from each other except via **core** or **sync** where unavoidable.

## Docs

- [docs/offline/README.md](../../../../../docs/offline/README.md) — offline doc index
- [docs/offline/architecture.md](../../../../../docs/offline/architecture.md)
- [docs/offline/auth.md](../../../../../docs/offline/auth.md)
- [docs/README.md](../../../../../docs/README.md) — full project doc map

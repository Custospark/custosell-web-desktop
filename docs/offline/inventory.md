# Offline inventory & catalog snapshots

Inventory offline support covers product and category creates, updates, and deletes through the shared mutation queue, plus **durable server catalog snapshots** for offline reads after logout.

Related: [architecture.md](./architecture.md) · Sales snapshots in [sales.md](./sales.md)

## Server catalog snapshots (`serverCatalogs`, DB v12)

When the app fetches lists from the server, it backs them up to IndexedDB keyed by `businessId`:

| Entity | Store key pattern | Notes |
|--------|-------------------|--------|
| Products | `products:{businessId}:full` or `:active` | Sales-only staff use `/products/active` |
| Categories | `categories:{businessId}:default` | |
| Customers | `customers:{businessId}:default` | |
| Roles | `roles:{businessId}:default` | Settings |
| Staff | `staff:{businessId}:default` | Settings |

Sales history snapshots (`sales` entity) are documented in [sales.md](./sales.md).

### Read order (offline client path)

1. React Query in-memory cache (same session)
2. IndexedDB `serverCatalogs` snapshot for logged-in `business_id`
3. Pending local mutation overlay (`localProductsStore`, `localCategoriesStore`, etc.)
4. Stock ledger quantity overlay (`stock` store)

Logout clears React Query but **keeps** IDB snapshots, so offline re-login still loads the catalog.

### Write / refresh

- After successful server fetch → `backupCatalogSnapshot()` (background)
- After online login/register → `refreshAllServerCatalogSnapshots()`
- After sync tier completes → `refreshAllServerCatalogSnapshots()`
- After online CRUD mutations → entity-specific snapshot refresh in query modules

### Key modules

| Path | Role |
|------|------|
| `offline/catalogs/serverCatalogStore.ts` | IDB read/write for `serverCatalogs` |
| `offline/catalogs/catalogSnapshotUtils.ts` | `readCatalogBaseline`, `backupCatalogSnapshot`, `resolveAuthBusinessId` |
| `offline/catalogs/catalogSnapshotRefresh.ts` | API fetch + backup per entity |
| `modules/inventory/api/products/ProductQueries.ts` | Products + categories wired to snapshots |
| `modules/customers/api/customers/CustomerQueries.ts` | Customer snapshot paths |
| `modules/settings/api/settings/RoleQueries.ts` / `StaffQueries.ts` | Settings catalog snapshots |
| `app/store/hooks/useSeedStockLedger.ts` | Seed stock ledger from IDB product catalog on offline boot |

## Stock ledger

- `offline/inventory/stockLedger.ts` - local quantity overrides per product
- Seeded from product catalog snapshot when RQ cache empty (`useSeedStockLedger`)
- Sale deductions via `completeOfflineSale` batch adjust
- Manual adjustments offline via `completeOfflineStockAdjustment` → pending row in sync pipeline tier 4
- **Online overlay rule:** ledger quantities apply on top of server products only when offline, or when that product has a **pending** unsynced adjustment. Stale seeded ledger rows must not override fresh server stock after an online adjust.

### Stock adjustment (manual)

| Mode | Path |
|------|------|
| Online | `POST /stock-movements` → cache + IDB ledger updated → catalog snapshot refresh |
| Offline | `stockLedger.adjust()` + pending adjustment → `processStockAdjustments()` on sync |

Optimistic local movements include `created_by` + `created_by_user` from the auth slice so Stock History shows the logged-in user before sync. Server sale/refund/import paths also persist `created_by` (see ADR `2026-07-11-stock-movement-actor-attribution`).

Key modules: `completeOfflineStockAdjustment.ts`, `useCreateStockMovement()` in `ProductQueries.ts`, `offlineStockOverlay.ts`.

## Product validation failures

Offline product creates are saved locally and queued as `POST /products` mutations. If the queued create later fails server validation, the sync engine stores the message on the local product record.

Failed rows show a red **Sync failed** badge with the validation message in the edit drawer.

## Correcting failed products

Editing a pending or failed product create does not duplicate local rows or queue entries.

- **Online:** corrected payload posted directly to `/products`; local row + queue removed on success.
- **Offline:** existing row and queued mutation updated in place, requeued.
- Server rejection again → error shown; row remains editable.

## Category sync

- `sanitizeCategory` / `extractCategoryPayload` safe paths in `ProductQueries.ts`
- `reconcileDuplicateCategoryCreate` in sync engine when duplicate name hits server on sync
- Safe `onSuccess` prevents `_pendingSync` undefined errors on create

## Manual test: logout → offline login → products

1. Sign in online and open Inventory → Products (wait for list to load).
2. Log out.
3. Go offline (DevTools → Network → Offline).
4. Sign in with the same device credentials.
5. Open POS or Products - catalog should load from IndexedDB snapshot.

## Residual limitations

- Failed-sync correction scoped to queued **creates** for products; updates/deletes use standard queue behavior.
- Low-stock and stock-movement endpoints are **not** snapshotted; they require network.
- Platform admin queries are never persisted.
- **B2B supply chain** (marketplace, purchase orders, incoming orders, supply listing/profile) is **online-only** - no IndexedDB or mutation-queue path. See [modules/inventory-supply-chain.md](../modules/inventory-supply-chain.md).

# Offline architecture overview

Custosell is an **offline-capable** retail POS. Writes go to IndexedDB immediately; reads merge server snapshots, React Query cache, and pending local rows. Sync drains the mutation queue when connectivity returns.

## Design principles

1. **Write-local, read-merged** — Sales, inventory, expenses, and settings mutations persist locally first, then queue for the server.
2. **Durable catalog snapshots** — Server list responses are backed up to IndexedDB so data survives **logout** and **offline re-login**.
3. **Ordered sync** — Auth and dependency-sensitive entities (shifts, roles, categories) sync before dependents.
4. **Single connectivity truth** — Redux `networkSlice.systemStatus` drives offline vs server-first reads (`offlineQueryUtils.ts`).
5. **No logout on flaky reconnect** — Device local sessions upgrade silently to server sessions when online (`sessionUpgrade.ts`).

## Connectivity states

| `systemStatus` | Meaning | Read strategy | Write strategy (sales example) |
|----------------|---------|---------------|--------------------------------|
| `offline` | API unreachable or `navigator.onLine === false` | Client / IDB only | Complete locally instantly |
| `slow` | API reachable, latency > 1s | **Server-first** | Try server (4s timeout) → local fallback on network failure |
| `online` | Normal | Server-first | Server-first |

Only **`offline`** (or browser offline) triggers instant local completion for sales. **`slow` is not offline** — staff may wait on API timeouts before local fallback.

Probe: `connectivityCheck.ts` → `GET /sales` with 8s timeout; 401/403 still counts as reachable.

## IndexedDB (`CustosellOffline` v12)

| Store | Purpose |
|-------|---------|
| `mutations` | Outbound API queue (POST/PUT/PATCH/DELETE) |
| `localSales` | Pending sale records |
| `localRefunds` | Pending refund overlays |
| `localShifts` | Pending shift open/close |
| `localProducts` | Pending product CRUD |
| `localCategories` | Pending category CRUD |
| `localCustomers` | Pending customer CRUD |
| `localExpenses` | Pending expense CRUD |
| `localExpenseCategories` | Pending expense category CRUD |
| `localRoles` | Pending role CRUD |
| `localStaff` | Pending staff CRUD |
| `localBusinessSettings` | Pending business settings updates |
| `localAuth` | Device login verifiers + pending registration |
| `localGuideFeedback` | Pending guide feedback |
| `stock` | Per-product quantity ledger overlay |
| `adjustments` | Non-sale stock adjustments pending sync |
| `serverCatalogs` | Durable server list snapshots (keyed by entity + businessId) |
| `secureSecrets` | Encrypted auth session, device login password |
| `secureKeys` | AES-GCM master key for `secureSecrets` |

React Query cache (localStorage persister `CUSTOSELL_QUERY_CACHE`) is **cleared on logout**; IndexedDB snapshots and device credentials **persist**.

## Read path (generic)

```
1. React Query in-memory cache (same session)
2. IndexedDB serverCatalog snapshot (after logout / empty cache)
3. Pending local mutation overlay (local*Store)
4. Domain overlays (e.g. stock ledger on products)
```

Implemented via `readWithOfflineStrategy()` in `offlineReadStrategy.ts` and `readCatalogBaseline()` in `catalogSnapshotUtils.ts`.

## Reconnect pipeline

Triggered when `systemStatus` leaves `offline` or on online bootstrap with a device local session.

**Phase 1 — silent auth (must finish first)**

All of these coordinate on the same `upgradeLocalSessionIfOnline()` promise:

- Axios `ensureServerSession()` on every non-auth request
- `useSyncQueryOnlineStatus` before React Query `refetchOnReconnect`
- `useOfflineSync` before mutation queue drain
- `AuthBootstrap` / offline login when already online

```
upgradeLocalSessionIfOnline()
  → applyServerAuth() — server token + auth slice + storage
  → postSessionUpgradeRefresh() — profile, catalogs, shifts
```

**Phase 2 — data sync (after Phase 1)**

```
syncPendingDataIfOnline() → syncCoordinator
  a. syncAuthMutations()        — pending registration only if still queued
  b. runSyncPipeline()          — tiered entity sync (shifts, sales, …)
invalidateAfterFullSync()
purgeSyncedOptimisticFromCache()
```

See [offline-auth.md](./offline-auth.md) for gating detail and [offline-sales.md](./offline-sales.md) for mutation tier order.

## Catalog snapshots (`serverCatalogs`)

Keyed as `{entity}:{businessId}:{catalogKind}` via `serverCatalogStore.ts`.

| Entity | Kinds | Refresh triggers |
|--------|-------|------------------|
| products | `full`, `active` | Login, sync, online CRUD |
| categories, customers, roles, staff | `default` | Login, sync, online CRUD |
| sales | `list`, `shift:{id}`, `daily:{date}` | Login, sync, successful GET |

`refreshAllServerCatalogSnapshots()` in `catalogSnapshotRefresh.ts` runs on online login/register and after full sync.

## Module map

| Concern | Primary files |
|---------|---------------|
| DB open / migrate | `offlineDb.ts` |
| Queue | `mutationQueue.ts` |
| Sync engine | `syncEngine.ts`, `syncSalesBatch.ts`, `syncAuthEngine.ts` |
| Coordinator + UI progress | `syncCoordinator.ts`, `syncProgressReporter.ts` |
| Cache invalidation | `syncCacheRefresh.ts` |
| Catalog backup/load | `catalogSnapshotUtils.ts`, `catalogSnapshotRefresh.ts`, `salesCatalogSnapshot.ts` |
| Auth session | `secureStorage.ts`, `deviceCredentials.ts`, `deviceLoginSecrets.ts`, `completeOfflineLogin.ts` |
| Session upgrade | `sessionUpgrade.ts`, `authSessionApply.ts`, `sessionRefresh.ts` |
| Sales offline | `completeOfflineSale.ts`, `salesQueries.ts` |
| Shifts offline | `completeOfflineShift.ts`, `ShiftQueries.ts` |
| Stock | `stockLedger.ts`, `offlineStockOverlay.ts`, `useSeedStockLedger.ts` |
| Network | `networkSlice.ts`, `connectivityCheck.ts`, `useNetworkStatusMonitor.ts` |

## UI shell

Global status banners render **above** the layout shell so navbar/sidebar geometry stays stable. See [app-shell.md](./app-shell.md).

## Residual platform limitations

- **Multi-till offline** — Each device is locally authoritative; no real-time stock coordination across devices.
- **Slow / flaky internet** — Treated as online; sales may wait ~4s before local fallback.
- **Shift list** — Not catalog-snapshotted; active shift refreshed from server after session upgrade.
- **Low-stock / stock-movement APIs** — Not snapshotted.
- **Profile, password, avatar, PDF reports** — Online-only.
- **Platform admin** — Never persisted to IDB or RQ persister.

See [offline-readiness.md](./offline-readiness.md) for boutique operational guidance.

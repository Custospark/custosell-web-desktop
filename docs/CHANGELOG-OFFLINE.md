# Offline platform changelog (frontend)

Summary of major offline-related work for documentation traceability.

## 2025–2026 — Catalog snapshots & sales history

- **DB v12** — `serverCatalogs` object store
- **Product catalog snapshots** — full/active products, categories; read baseline after logout
- **Customer, roles, staff snapshots** — same pattern via `catalogSnapshotRefresh.ts`
- **Sales catalog snapshots** — `list`, `shift:{id}`, `daily:{date}` in `salesCatalogSnapshot.ts`
- **Stock ledger seed** — `useSeedStockLedger` from IDB product catalog on offline boot
- **Category sync fixes** — duplicate name reconciliation, safe create `onSuccess`

## 2025–2026 — Authentication & reconnect

- **Online login server-first** — no offline fallback when online; `backupOnlineAuthToOffline` async
- **`pendingAuthSync` decoupled from `isLocalSession`** — banner only for pending registration
- **Legacy session normalization** — `normalizeStoredSession()` on bootstrap
- **Silent session upgrade** — `upgradeLocalSessionIfOnline()` on reconnect
- **Encrypted device password** — `deviceLoginSecrets.ts` for upgrade without queued login
- **`applyServerAuth` + `postSessionUpgradeRefresh`** — profile, catalogs, shifts after upgrade

## 2025–2026 — UI shell

- **Status banners above layout** — `AppChrome` / `AppStatusBanners` (auth, offline, sync)
- **Navbar network colors** — emerald / orange / red for online / slow / offline
- **Dashboard charts** — My Shift–style area chart; uppercase graph subtitles

## Documentation index

See [README.md](./README.md) for full doc map.

# Offline platform changelog (frontend)

Summary of major offline-related work for documentation traceability.

## 2026-08-11 — Sync hang / cross-account hardening (DB v14)

- **DB v14** — `entityIdMappings` object store (`[entity, oldId]` key; indexes `businessId`, `createdAt`); replaces the order-only map with durable temp→server id maps for **order, sale, category, role, shift, expense-category**.
- **Cross-account scoping** — `QueuedMutation.businessId` stamped at enqueue; `mutationQueue.getPending()` only returns the current business's queued work (auth register/login exempt). All id-remap helpers skip other accounts' rows. `remapBusinessContext` now rewrites `businessId` on queued mutations + id mappings during offline-registration promote.
- **Dependency guard** — `guardScopedMutations` runs inside `getPending()`. For any mutation still referencing a negative (temp) id it: waits while the create is queued this pass, re-drives a failed create (`requeueKeepRetries` honors `maxRetries`), remaps via the durable id map once the create has committed, and otherwise fails the dependent with a visible message. This eliminates the infinite "Order mutation waiting for create remap" / "Updating inventory…" state for order updates+cancels, sale payments+refunds, sales/expenses waiting on shift, staff waiting on role, and products waiting on category.
- **Refactor** — `syncEngine.ts` (950 lines) split into `syncMutators`, `syncExtractors`, `syncCreateProcessors`, `syncMutationRunner`, `syncStock`, `syncDependencyGuard`, `syncDependencyDecider`, `entityIdMapper` (all ≤ 500 lines).
- **Tests** — `orderDependencyDecider.test.ts` (decider decision table across every entity).

## 2026-07-11 — POS orders persistence

- **DB v13** — `localOrders` object store
- Hold/Take uses API orders + offline overlay; `activeOrderId` in Redux
- Sync: order creates before sales; remap `order_id` on sale payloads
- One-time migration of `localStorage.heldOrders` → `POST /orders`

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

## 2026-06-10 — Silent auth ordering (401 logout fix)

- **`ensureServerSession()`** — axios request interceptor blocks API calls until device session upgrades
- **`useSyncQueryOnlineStatus`** — delays React Query `onlineManager` until upgrade completes
- **401 guard** — no forced logout during upgrade, when upgrade needed, or for `localSessionRequest` tags
- **Early upgrade triggers** — `AuthBootstrap` hydrate + offline login when network already back
- **Connectivity probe** — `skipSessionUpgrade: true` on latency `GET /sales`

## 2026-06-10 — Error message sanitization

- **LoginPage error banner** — raw `IndexedDB open timed out` no longer exposed; routes through `sanitizeErrorMessage` / `isNetworkFailure` for user-friendly messages
- **README.md** — subtitle updated from "boutiques" to "28 business types" matching landing page

## 2026-06-10 — Offline npm library (future work doc)

- **`docs/future-work/offline-npm-library.ipynb`** — Jupyter notebook planning `@opiyo/offline-core` extraction

## 2026-06-10 — Documentation reorganized under `docs/`

- **`docs/offline/`** — architecture, auth, domain modules, testing, changelog
- **`docs/app/`** — shell, service worker
- **`docs/platform/`** — desktop release
- **`docs/product/`** — monetization, design system
- **`docs/future-work/`** — planning notebooks
- **`docs/team/`** — agents playbook notebook

## 2026-06-10 — Offline folder modularization

- **`offline/` subfolders** — `core`, `auth`, `sales`, `inventory`, `customers`, `expenses`, `settings`, `catalogs`, `sync`, `guide`, `testing`
- **`offline/README.md`** — folder map and import conventions
- Migration scripts: `scripts/refactor-offline-imports.mjs`, `scripts/fix-offline-parent-imports.mjs` (one-shot)

## Documentation index

See [../README.md](../README.md) for full doc map.

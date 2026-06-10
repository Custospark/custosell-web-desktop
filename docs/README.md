# Custosell documentation

Technical documentation for the frontend application, with emphasis on **offline-first retail** for businesses in unreliable connectivity environments.

## Start here

| Document | Contents |
|----------|----------|
| [offline-architecture.md](./offline-architecture.md) | System overview, IndexedDB schema (v12), connectivity model, reconnect pipeline |
| [offline-auth.md](./offline-auth.md) | Login, device credentials, `pendingAuthSync` vs `isLocalSession`, silent session upgrade |
| [offline-sales.md](./offline-sales.md) | POS, shifts, refunds, sales catalog snapshots, sync order |
| [offline-inventory.md](./offline-inventory.md) | Products, categories, customers, catalog snapshots, stock ledger |
| [offline-expenses.md](./offline-expenses.md) | Expenses and expense categories offline |
| [offline-settings.md](./offline-settings.md) | Business settings, roles, staff offline |
| [offline-testing.md](./offline-testing.md) | Manual test plans and troubleshooting |
| [offline-readiness.md](./offline-readiness.md) | Operational assessment for unreliable-internet boutiques |
| [service-worker-strategy.md](./service-worker-strategy.md) | Web production caching (static + API GET) |
| [app-shell.md](./app-shell.md) | Global UI: status banners, navbar, layout chrome |

## Other docs

| Document | Contents |
|----------|----------|
| [CHANGELOG-OFFLINE.md](./CHANGELOG-OFFLINE.md) | Summary of major offline platform changes |
| [desktop-release.md](./desktop-release.md) | Electron desktop builds |
| [monetization-strategy.md](./monetization-strategy.md) | Product monetization notes |

## Key source locations

| Area | Path |
|------|------|
| IndexedDB schema | `src/renderer/app/store/offline/offlineDb.ts` |
| Mutation sync engine | `src/renderer/app/store/offline/syncEngine.ts` |
| Sync coordinator | `src/renderer/app/store/offline/syncCoordinator.ts` |
| Catalog snapshots | `src/renderer/app/store/offline/serverCatalogStore.ts`, `catalogSnapshotRefresh.ts` |
| Sales snapshots | `src/renderer/app/store/offline/salesCatalogSnapshot.ts` |
| Session upgrade | `src/renderer/app/store/offline/sessionUpgrade.ts`, `authSessionApply.ts` |
| Reconnect hook | `src/renderer/app/store/hooks/useOfflineSync.ts` |
| Network probe | `src/renderer/app/store/network/connectivityCheck.ts` |

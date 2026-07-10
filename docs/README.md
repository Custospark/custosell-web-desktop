# Custosell documentation

Technical documentation for the Custosell frontend (Electron + React + TypeScript), with emphasis on **offline-first retail** for businesses in unreliable connectivity environments.

## Quick start

| If you need… | Start here |
|--------------|------------|
| Offline system overview | [offline/architecture.md](./offline/architecture.md) |
| Login, reconnect, 401 fix | [offline/auth.md](./offline/auth.md) |
| Manual test plan | [offline/testing.md](./offline/testing.md) |
| Source code folder map | [../src/renderer/app/store/offline/README.md](../src/renderer/app/store/offline/README.md) |

---

## Offline platform

See [offline/README.md](./offline/README.md) for the full offline doc index.

| Document | Contents |
|----------|----------|
| [architecture.md](./offline/architecture.md) | IndexedDB schema (v12), connectivity, reconnect pipeline |
| [architecture-diagram.ipynb](./offline/architecture-diagram.ipynb) | Supplementary mermaid diagrams (notebook) |
| [auth.md](./offline/auth.md) | Device login, silent session upgrade, API gating |
| [sales.md](./offline/sales.md) | POS, shifts, refunds, sales catalog snapshots |
| [inventory.md](./offline/inventory.md) | Products, categories, customers, stock ledger |
| [expenses.md](./offline/expenses.md) | Expenses and expense categories |
| [settings.md](./offline/settings.md) | Roles, staff, business settings |
| [guide.md](./offline/guide.md) | Guide feedback offline queue |
| [testing.md](./offline/testing.md) | Manual tests and troubleshooting |
| [readiness.md](./offline/readiness.md) | Boutique / unreliable-internet assessment |
| [changelog.md](./offline/changelog.md) | Major offline platform changes |

## Application

| Document | Contents |
|----------|----------|
| [shell.md](./app/shell.md) | Status banners, navbar, layout chrome |
| [service-worker.md](./app/service-worker.md) | Web production caching (static + API GET) |

## Platform & product

| Document | Contents |
|----------|----------|
| [desktop-release.md](./platform/desktop-release.md) | Electron desktop builds |
| [estimates-module.md](./estimates-module.md) | Project estimates, costing, projects, job delivery |
| [documents-module.md](./documents-module.md) | Business file vault — folders, ACL, tags, cross-module links |
| [design-system.md](./product/design-system.md) | Colors, typography, UI patterns |
| [sales-conversation.ipynb](./product/sales-conversation.ipynb) | Sales role-play simulator (GTM) |

## Future work

| Document | Contents |
|----------|----------|
| [offline-npm-library.ipynb](./future-work/offline-npm-library.ipynb) | Plan to extract `@opiyo/offline-core` npm package |

## Team

| Document | Contents |
|----------|----------|
| [agents-playbook.ipynb](./team/agents-playbook.ipynb) | Custospark team orchestration playbook (`AGENTS.md` companion) |

## Architecture decisions (ADR)

| Document | Contents |
|----------|----------|
| [2026-07-04-accounting-module-architecture.md](./adr/2026-07-04-accounting-module-architecture.md) | Double-entry accounting module |
| [2026-07-08-pipeline-board-member-roles.md](./adr/2026-07-08-pipeline-board-member-roles.md) | Pipeline board viewer / contributor / manager roles |
| [2026-07-08-staff-drawer-module-access-parity.md](./adr/2026-07-08-staff-drawer-module-access-parity.md) | Staff drawer module access matches Module Access; owner email read-only |
| [2026-07-08-board-progress-targets.md](./adr/2026-07-08-board-progress-targets.md) | Board Progress canvas, targets/OKRs, pipeline vs project language |
| [2026-07-08-progress-decomposition-engine.md](./adr/2026-07-08-progress-decomposition-engine.md) | Column-aware metrics, hybrid goal decomposition, planning hierarchy |
| [2026-07-10-documents-acl-and-folder-model.md](./adr/2026-07-10-documents-acl-and-folder-model.md) | Documents module ACL, live inheritance, folder tree |

## Modules

| Document | Contents |
|----------|----------|
| [modules/pipeline-progress.md](./modules/pipeline-progress.md) | Board Progress v2 — columns, decomposition, My progress, export |

## Key source locations

| Area | Path |
|------|------|
| Offline code index | `src/renderer/app/store/offline/README.md` |
| IndexedDB schema | `src/renderer/app/store/offline/core/offlineDb.ts` |
| Mutation queue | `src/renderer/app/store/offline/sync/mutationQueue.ts` |
| Sync engine | `src/renderer/app/store/offline/sync/syncEngine.ts` |
| Sync coordinator | `src/renderer/app/store/offline/sync/syncCoordinator.ts` |
| Catalog snapshots | `src/renderer/app/store/offline/catalogs/` |
| Session upgrade | `src/renderer/app/store/offline/auth/sessionUpgrade.ts` |
| Reconnect hook | `src/renderer/app/store/hooks/useOfflineSync.ts` |
| Network probe | `src/renderer/app/store/network/connectivityCheck.ts` |

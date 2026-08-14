# ADR - Offline write durability across shutdown (flush barrier + persisted storage)

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend only.

## Context

All offline writes (stock adjustments, sales, products, expenses, customers, etc.) are persisted to IndexedDB (`CustosellOffline`), which survives app and OS restarts. The gap: the user-visible "instant" entry points launched their IndexedDB write in the background (`void persist...()`), so a hard power loss in the sub-second window between the click and the IndexedDB commit could drop the very latest record. There was no shutdown flush barrier and no eviction-exemption request.

## Decision

- **Track in-flight writes** - new `core/offlineWriteTracker.ts`: `trackWrite(promise)` registers every fire-and-forget background persist; `flushPendingWrites()` awaits all settled (with a timeout). All offline domains' background persists are wrapped in it.
- **Await the primary flows** - `completeOfflineStockAdjustmentInstant`, `completeOfflineSaleInstant`, and product create/update now `await` the durable IndexedDB write (mutation queue + local record + stock ledger) before the mutation resolves, so the UI only reports complete once the write is committed.
- **Shutdown flush barrier** - new `core/shutdownFlushBarrier.ts` installed at app bootstrap: drains in-flight writes on `pagehide`/`beforeunload`/`visibilitychange(hidden)`. In Electron, `before-quit` sends an `offline:flush-before-quit` IPC (via preload `offlineBridge`); the renderer flushes and replies, and `app.quit()` is deferred until done (5s timeout guard).
- **Eviction exemption** - `navigator.storage.persist()` is requested on boot so the IndexedDB backing store is not evicted under storage pressure.

## Consequences

- Offline data entered by a user survives a laptop/desktop shutdown and syncs when connectivity returns.
- The remaining theoretical loss is only a hard power-cut during the (now smaller) await window; a graceful shutdown is fully protected.
- Gates: FE `npm run vera:fast` passed; `npx tsc --noEmit` clean; `npx vitest run` 23/23 passed.

## References

- `src/renderer/app/store/offline/core/offlineWriteTracker.ts`
- `src/renderer/app/store/offline/core/shutdownFlushBarrier.ts`
- `src/renderer/app/store/offline/inventory/completeOfflineStockAdjustment.ts`, `completeOfflineProduct.ts`
- `src/renderer/app/store/offline/sales/completeOfflineSale.ts`
- `src/preload/preload.ts`, `src/main/main.ts` (before-quit flush IPC)
- `src/renderer/App.tsx` (barrier installation)

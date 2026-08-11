# ADR — Offline sync: durable id maps, dependency guard, and business scoping

- **Date:** 2026-08-11
- **Status:** Accepted
- **Stack:** Frontend (offline sync engine). No backend change.

## Context

A recurring, user-visible hang ("Updating inventory…" forever) was traced to `[SyncEngine] Order mutation waiting for create remap: …/orders/-1786048724897/cancel`. The sync pipeline skips a dependent mutation whose URL still references a negative (temp) order id whenever the same-pass `orderIdMap` has no entry. That map is rebuilt each pass from *creates still in the queue*, so a mutation can wait forever when its create:

1. already committed in a previous pass but the dependent was enqueued afterwards with the stale temp id, or
2. failed and left the `getPending()` view (only `queued` rows are returned), or
3. belongs to a different business/account on the same device.

The same structural pattern existed for sale payments/refunds (`/sales/{neg}/payment|refund`), sales/expenses waiting on a shift id, staff creates waiting on a role id, and product creates carrying a stale negative `category_id`.

A secondary finding: the single shared IndexedDB (`CustosellOffline`) hosts one global `mutations` queue with no business/account scoping, so one account's queued mutations could replay and remap under another account.

## Decision

1. **Business-scoped mutation queue.** Every `QueuedMutation` is stamped with `businessId` at enqueue (from the active auth user). `getPending()` returns only the current business's work; auth register/login mutations are exempt (they are account-scoped, not business-scoped). All id-remap helpers skip rows from other businesses. `remapBusinessContext` now rewrites `businessId` on queued mutations and id mappings when an offline registration is promoted to a server account.

2. **Durable entity id maps (DB v14).** A single `entityIdMappings` store (`[entity, oldId]`, indexed by `businessId`/`createdAt`) records temp→server ids for `order`, `sale`, `category`, `role`, `shift`, and `expense-category` the moment a create commits. Entries are pruned after 30 days.

3. **Dependency guard inside `getPending()`.** Before returning pending work, `guardScopedMutations` resolves every mutation that still references a negative id using one decision table (`decideDependency`):
   - create queued/syncing this pass → wait (the same-pass in-memory map handles it);
   - create failed with retries left → re-drive it (`requeueKeepRetries`, which preserves `retryCount` so `maxRetries` still terminates) and wait;
   - create committed → rewrite the URL or payload field via the durable map;
   - otherwise → fail the dependent with a visible message instead of waiting forever.

   Applied to: order update/cancel URLs, sale payment/refund URLs, sale payloads (`order_id`, `shift_id`), staff payloads (`role_id`), product payloads (`category_id`), expense payloads (`shift_id`, `expense_category_id`).

4. **Refactor for the 500-line gate.** `syncEngine.ts` (950 lines) was split into `syncMutators`, `syncExtractors`, `syncCreateProcessors`, `syncMutationRunner`, `syncStock`, `syncDependencyGuard`, `syncDependencyDecider`, and `entityIdMapper` (all ≤ 500 lines), matching the team rule that an already-oversized file must be modularized before being touched.

## Consequences

- **No more indefinite "waiting for create remap"**: every dependency either resolves, is re-driven within `maxRetries`, or fails with an actionable message that surfaces instead of wedging the coordinator.
- **No cross-account replay/remap**: queued work and id remaps are confined to the active business.
- **Trade-offs**:
  - `getPending()` does extra IndexedDB reads (local records + id map lookups) whenever pending work exists. Acceptable for the offline-first volume; not run when the queue is empty.
  - Legacy mutations created before `businessId` existed are treated as current-business (status quo behaviour — no regression, new rows are scoped).
  - Failed dependents stop retrying automatically; a future "retry all failed" UI action can call `requeue`.
- Durable maps are append-only with TTL pruning; a mapping could in theory resolve an old temp id to an unrelated order after the app is reinstalled, but the 30-day TTL and business-id check bound this to zero practical risk.

## References

- `src/renderer/app/store/offline/sync/mutationQueue.ts` — `businessId`, `getPending()` scoping, `requeueKeepRetries`, remap helpers.
- `src/renderer/app/store/offline/sync/syncDependencyGuard.ts` / `syncDependencyDecider.ts` — resolution logic.
- `src/renderer/app/store/offline/sync/entityIdMapper.ts` — durable id maps.
- `src/renderer/app/store/offline/core/offlineDb.ts` — DB v14 `entityIdMappings`.
- `src/renderer/app/store/offline/sales/syncSalesBatch.ts` — sale id map on commit.
- `src/renderer/app/store/offline/core/remapBusinessContext.ts` — business-id rewrite on registration promote.
- `src/renderer/shared/utils/__tests__/orderDependencyDecider.test.ts` — regression tests.

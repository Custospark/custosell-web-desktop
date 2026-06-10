# Offline testing guide

Consolidated manual tests for Custosell offline behavior. See also `src/renderer/app/store/offline/test_guide.txt` for dev-server vs production build notes.

## Prerequisites

- Backend running (e.g. `http://localhost:8000`)
- Frontend: `npm run dev:react` (dev) or `npm run react:build` + static serve (full SW)
- Test user signed in **online at least once** on the device

## Environment matrix

| Mode | Offline support | Notes |
|------|-----------------|-------|
| Vite dev | Partial | IDB + RQ; SW if registered |
| Production web build | Full | `sw.js` cache-first static, stale API GET |
| Electron | Full | Bundled assets + IDB (no SW) |

## 1. Core sale offline

1. Load app online; open POS products.
2. DevTools → Network → **Offline**.
3. Complete a sale — expect `<200ms`, `OFF-*` receipt, “Pending sync” badge.
4. Check Sales History, Dashboard today, My Shift totals include the sale.
5. Reconnect — sync runs; badge clears; server receipt ID assigned.

## 2. Logout → offline login → catalog

1. Online: open **Inventory → Products** (wait for load).
2. Log out → offline → sign in with same credentials.
3. Products load from `serverCatalogs` snapshot (not empty).
4. Repeat for **Customers**, **Sales History**.

## 3. Logout → offline login → sales history

1. Online: open Sales History (+ My Shift if clocked in).
2. Log out → offline → sign in.
3. Prior server sales visible from `sales:{businessId}:list`.
4. Shift sales from `sales:{businessId}:shift:{shiftId}` if that shift was loaded online.
5. New offline sales merge from `localSalesStore` on top.

## 4. Silent session upgrade

1. Offline login (existing user) — **no** `AuthPendingBanner`.
2. Restore internet while staying in app.
3. User **not** redirected to login; navbar shows Connected.
4. `isLocalSession` becomes false; profile query enabled; shift badge updates from `/shifts/active`.

## 5. Pending registration

1. Register new business **offline**.
2. `AuthPendingBanner` visible.
3. Reconnect — registration + login sync; banner clears.

## 6. Shift offline

1. Offline: clock in → negative shift ID, “Shift pending sync”.
2. Make sales attached to shift.
3. Reconnect — shift open syncs first; IDs remap; sales queue uses server shift ID.
4. Clock out offline — close queued; syncs after open.

## 7. Refund offline

1. Refund a **synced** sale offline — refund pending badge.
2. Attempt refund on `OFF-*` sale — should block until sale syncs.

## 8. Product sync failure correction

1. Queue invalid product create offline.
2. Reconnect — server rejects; red “Sync failed” on row.
3. Edit product online — direct correction or requeue; badge clears on success.

## 9. Category duplicate on sync

- Duplicate category name on sync is reconciled in sync engine (`reconcileDuplicateCategoryCreate`).
- Category create uses safe `onSuccess` / `sanitizeCategory` paths in `ProductQueries.ts`.

## What to expect in UI

| Signal | Meaning |
|--------|---------|
| Red offline banner | Completely offline |
| Orange slow indicator | API reachable but high latency |
| Emerald connected | Online |
| Amber auth pending banner | Offline registration not synced |
| Pending sync badge | Local row awaiting server |
| Sync progress banner | Coordinator running |

## Troubleshooting

| Problem | Action |
|---------|--------|
| White screen offline (dev) | Use production build test |
| Stale cache | Clear `CUSTOSELL_QUERY_CACHE` in localStorage |
| Corrupt IDB | Delete `CustosellOffline` database; re-login online |
| Sales not syncing | Confirm backend up; network Connected; check failed mutations in IDB |
| Auth banner after device login | Update to build with `normalizeStoredSession`; re-login online once |
| IndexedDB open timeout | Close other Custosell tabs; retry login |

## Automated checks

```bash
npx tsc -b
```

Run after offline-related changes.

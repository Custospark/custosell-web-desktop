# Offline Settings

Settings offline support covers business settings, roles, and staff. Profile and password updates stay online-only because they can include multipart avatar uploads and credential changes.

## Stores

IndexedDB version 9 adds these local stores:

- `localRoles`: pending role create/update/delete records keyed by `localId`, indexed by `syncStatus`, `mutationId`, and `roleId`.
- `localStaff`: pending staff create/update/delete records keyed by `localId`, indexed by `syncStatus`, `mutationId`, `staffId`, and `roleId`.
- `localBusinessSettings`: pending business settings updates keyed by `localId`, indexed by `syncStatus`, `mutationId`, and `businessId`.

Each store keeps the optimistic entity, JSON queue payload, mutation type, sync status, last sync error, and timestamps. UI rows use `_pendingSync`, `_syncFailed`, `_lastError`, `_mutationType`, and `_localId` metadata from the local store helpers.

## Queue And Sync Order

Offline Settings mutations enqueue JSON payloads only. Local records are saved only after the mutation queue returns a valid mutation id.

Sync order matters for role-staff dependencies:

1. Role creates sync before staff creates.
2. When a local role create receives its server id, pending staff records are rewritten from the negative role id to the server role id.
3. Queued `/users` POST and PUT payloads with the old `role_id` are rewritten before staff sync runs.
4. Staff creates then sync before the remaining generic queued mutations where practical.

Delete tombstones are removed from local stores after their queued delete succeeds. Failed settings records stay pending/failed so the UI can show the server validation error and retry after correction.

Sync only drains when the app is not completely offline. A `slow` network state is still treated as reachable, so reads and writes try the server first and only fall back to local completion on network failure.

## Business Settings

Business settings updates use last-local-view-wins behavior in the UI. Multiple queued business updates are allowed. Offline update completion patches:

- React Query cache key `['business', 'mine']`
- Auth slice business data via `setBusiness`
- The local `localBusinessSettings` row for retry/sync tracking

`useBusiness` reads the latest pending local business settings when present. If there is no pending local row, it can fall back to the authenticated user's business snapshot before requiring the server.

After a business settings sync succeeds, the sync engine dispatches `setBusiness` with the server-confirmed business when available.

## Cache Reconciliation

After sync, `purgeSyncedOptimisticFromCache` strips stale optimistic Settings rows from literal query keys:

- `['roles', 'list']`
- `['staff', 'list']`
- `['business', 'mine']`

`useOfflineSync` also invalidates `['roles']`, `['staff']`, and `['business']` after a sync pass.

## UI Boundaries

Roles and staff show a `Pending sync` badge for queued local rows and a red `Sync failed` badge for rows rejected by server validation. Pending and failed staff/role rows can be edited or deleted. Editing a pending/failed row rewrites the same local store row and the same queued mutation payload, then requeues it; it does not enqueue duplicate mutations or local rows.

Pending staff creates show password and confirmation fields when edited. Passwords are not prefilled, so the user must enter a fresh password before the corrected create payload can be saved.

Business settings show a pending sync notice when the current business came from local offline state.

Profile and password changes require internet. The profile form disables save offline and shows: `Profile and password changes require internet.`

## Residual Limitations

- Profile changes, password changes, and avatar uploads are online-only.
- Subscription settings remain out of scope for offline support.
- Business settings updates are not coalesced in the queue; if multiple updates are saved offline, each queued payload syncs later while the UI shows the latest local view.
- Role and staff pending edits are coalesced into the existing queued mutation only. Business settings updates are still allowed to queue separately as described above.

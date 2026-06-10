# Offline Settings

Settings offline support covers business settings, roles, and staff. Profile and password updates stay online-only because they can include multipart avatar uploads and credential changes.

See also: [architecture.md](./architecture.md) · [inventory.md](./inventory.md) (roles/staff catalog snapshots)

## Stores

In `CustosellOffline` (currently v12), these local stores hold pending settings mutations:

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

Sync only drains when the app is not completely offline. A `slow` network state is still treated as reachable, so reads and writes try the server first.

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

Staff create/update/delete only creates pending local staff rows when the app is explicitly offline. When online, staff writes go straight to `/users` and the staff list cache is patched from the server response with no `Pending sync` badge. If an online staff create reaches the server but the client receives no response, the create flow checks the server staff list by email before surfacing an error; it does not queue a duplicate local create. If an older queued staff create later fails sync because the email already exists, the sync engine performs the same lookup and treats the local row as synced when it finds the matching server staff record. This prevents false `Sync failed` badges for staff that were already saved by the server.

Staff lists keep the current user, business owner, and admin users visible. The UI marks them with `You`, `Business Owner`, and `Admin` badges where the current role slug is available. The current user's own account cannot be deleted, deactivated, or assigned a different role. The business owner account cannot be deleted or deactivated. These delete safeguards run before pending local deletes, offline delete queueing, or online API deletes, so protected staff deletes are never queued for sync.

Staff update forms preserve locked role and status values for protected accounts. When the current user, business owner, or admin account is edited, the update payload keeps the existing `role_id` and `is_active` values instead of trusting disabled form controls or stale local edits. The same preserved payload is written to the mutation queue for offline staff updates, so sync replay keeps the locked role/status behavior.

Locked owner, admin, and self staff updates can preserve an unassigned or null `role_id` and still save name, email, phone, or password changes. Attempts to clear an existing role are rejected instead of being queued or synced.

Sync-failed staff rows remain editable. Correcting a rejected staff update while online tries the `/users` API immediately and removes the local staff row plus queued mutation after the server accepts it. If the app is explicitly offline, the correction rewrites the failed local row and its queued payload with the latest preserved role/status values, then requeues the same mutation instead of creating a duplicate offline update.

Deleting a pending server-backed staff update while online calls the server delete endpoint first, then clears the stale local row and queued mutation after success. Pending staff creates with temporary local ids are still local-only until they sync or are discarded.

Business settings show a pending sync notice when the current business came from local offline state.

Profile and password changes require internet. The profile form disables save offline and shows: `Profile and password changes require internet.`

## Backend Enforcement

The backend remains the final authority for staff safety rules. Staff updates reject role assignments that cross business boundaries, and protected deletes reject attempts to delete the current user or the business owner. Frontend guards prevent these actions from being queued where possible, but synced payloads must still pass the backend checks before local staff rows are marked synced.

## Residual Limitations

- Profile changes, password changes, and avatar uploads are online-only.
- Subscription settings remain out of scope for offline support.
- Business settings updates are not coalesced in the queue; if multiple updates are saved offline, each queued payload syncs later while the UI shows the latest local view.
- Role and staff pending edits are coalesced into the existing queued mutation only. Business settings updates are still allowed to queue separately as described above.

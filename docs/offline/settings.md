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

Roles and staff show a `Pending sync` badge for queued local rows and a red `Sync failed` badge for rows rejected by server validation. Pending and failed staff/role rows can be edited; pending local-only staff creates can be discarded. Editing a pending/failed row rewrites the same local store row and the same queued mutation payload, then requeues it; it does not enqueue duplicate mutations or local rows.

Pending staff creates show password and confirmation fields when edited. Passwords are not prefilled, so the user must enter a fresh password before the corrected create payload can be saved.

Staff create/update only creates pending local staff rows when the app is explicitly offline. When online, staff writes go straight to `/users` and the staff list cache is patched from the server response with no `Pending sync` badge. If an online staff create reaches the server but the client receives no response, the create flow checks the server staff list by email before surfacing an error; it does not queue a duplicate local create. If an older queued staff create later fails sync because the email already exists, the sync engine performs the same lookup and treats the local row as synced when it finds the matching server staff record. This prevents false `Sync failed` badges for staff that were already saved by the server.

**Staff attach and detach are online-only.** Email lookup (`GET /users/lookup`), attach (`POST /users/attach`), and detach (`POST /users/{id}/detach`) refuse when offline with a clear toast. Detach removes membership from this business while keeping the person's login; it does not soft-delete the user. `DELETE /users/{id}` is not used (API returns 422).

Staff lists keep the current user, business owner, and admin users visible. The UI marks them with `You`, `Business Owner`, and `Admin` badges where the current role slug is available. The current user's own account cannot be detached or assigned a different role. The business owner account cannot be detached. These detach safeguards run before the detach API call, so protected staff are never detached from the UI.

Staff update forms preserve locked role values for protected accounts. When the current user or business owner account is edited, the update payload keeps the existing `role_id` instead of trusting disabled form controls or stale local edits. Staff PUT payloads must not send `is_active` (membership is managed via detach/attach). The same preserved role payload is written to the mutation queue for offline staff updates, so sync replay keeps the locked role behavior.

Locked owner, admin, and self staff updates can preserve an unassigned or null `role_id` and still save name, email, phone, or password changes. Attempts to clear an existing role are rejected instead of being queued or synced.

Sync-failed staff rows remain editable. Correcting a rejected staff update while online tries the `/users` API immediately and removes the local staff row plus queued mutation after the server accepts it. If the app is explicitly offline, the correction rewrites the failed local row and its queued payload with the latest preserved role values, then requeues the same mutation instead of creating a duplicate offline update.

Pending staff creates with temporary local ids are still local-only until they sync or are discarded. Detaching a synced staff member while online posts to `/users/{id}/detach` and removes them from the staff list cache.

Business settings show a pending sync notice when the current business came from local offline state.

Profile and password changes require internet. The profile form disables save offline and shows: `Profile and password changes require internet.`

## Backend Enforcement

The backend remains the final authority for staff safety rules. Staff updates reject role assignments that cross business boundaries, and protected detach rejects attempts to detach the current user or the business owner. Frontend guards prevent these actions where possible, but API payloads must still pass the backend checks.

## Residual Limitations

- Profile changes, password changes, and avatar uploads are online-only.
- Staff email lookup, attach, and detach are online-only.
- Subscription settings remain out of scope for offline support.
- Business settings updates are not coalesced in the queue; if multiple updates are saved offline, each queued payload syncs later while the UI shows the latest local view.
- Role and staff pending edits are coalesced into the existing queued mutation only. Business settings updates are still allowed to queue separately as described above.

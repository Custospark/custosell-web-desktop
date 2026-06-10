# Offline authentication

Authentication supports **online server login**, **offline device login**, and **silent session upgrade** when connectivity returns.

## Auth state flags

| Flag | Meaning |
|------|---------|
| `isAuthenticated` | User has a session (local or server token) |
| `isLocalSession` | Token is `local_*` — not sent as Bearer to API |
| `pendingAuthSync` | **Pending registration only** — account not yet on server |

**Important:** `pendingAuthSync` is **not** the same as `isLocalSession`. A normal offline device login has `isLocalSession: true` and `pendingAuthSync: false`. Only offline **registration** sets `pendingAuthSync: true` (shows amber `AuthPendingBanner`).

## Online login (server-first)

`useLogin` in `AccountQueries.ts`:

1. When **not** completely offline → `POST /auth/login` to server only.
2. On success → Redux `loginSuccess`, `backupOnlineAuthToOffline()` (async, non-blocking).
3. Network/server errors are **not** masked with offline fallback when online.
4. `refreshAllServerCatalogSnapshots()` runs after online login.

## Offline login (device credentials)

`completeOfflineLogin.ts`:

1. Verify email/password against `localAuthStore` password verifier.
2. Issue `local_*` session token via `createLocalSessionToken()`.
3. **Existing user:** `pendingAuthSync: false`, enqueue `POST /auth/login` for later sync, save encrypted password for silent upgrade.
4. **Pending registration:** `pendingAuthSync: true`, no server login queue until registration syncs.

Prerequisite: user must have signed in **online at least once** on this device (or completed offline registration flow).

## Secure storage

| Storage | Contents |
|---------|----------|
| `secureSecrets` (`auth_session`) | Encrypted JSON: token, user, `isLocalSession`, `pendingAuthSync` |
| `secureSecrets` (`device_login_pw:{email}`) | Encrypted password for silent upgrade |
| `localAuth` | Password verifier hash + user snapshot per email |
| `localStorage` legacy mirror | Fallback token/user if encrypted IDB read fails |

`AuthBootstrap` hydrates session on app load and runs `normalizeStoredSession()` to correct legacy `pendingAuthSync` for device logins.

## Bearer token resolution

`resolveBearerToken()` in `axiosConfig.ts` **strips** `local_*` tokens — API calls send no Authorization until session is upgraded. Local sessions skip 401 forced logout (`skipAuthRedirect`).

`useProfile` is disabled while `isLocalSession` — profile loads from auth slice snapshot until upgrade.

## Silent session upgrade

When a user signs in offline (device credentials), the app holds a `local_*` token. That token is **not** sent as `Authorization` to the API. On reconnect, the app must promote the session to a **server Bearer token** and refresh the auth slice **before** any other server work runs.

### Why ordering matters

If sales/products queries or React Query `refetchOnReconnect` run first, they hit the API without a valid Bearer token, receive `401 Unauthenticated`, and the axios interceptor can force logout. Silent auth must win the race.

### Execution order (reconnect or online boot with local session)

```
Phase 1 — Silent session upgrade (blocks everything below)
  ├─ upgradeLocalSessionIfOnline()  [single shared promise]
  ├─ Queued POST /auth/login OR direct POST /auth/login (device password)
  └─ applyServerAuth()
       ├─ Redux: server token, isLocalSession=false, user/business/shift fields
       ├─ Encrypted session + device credentials persisted
       └─ postSessionUpgradeRefresh() (profile cache, catalogs, shifts/sales, /shifts/active)

Phase 2 — Only after Phase 1 completes (or is not needed)
  ├─ Authenticated API requests (products, sales, dashboard, …)
  ├─ React Query refetchOnReconnect
  └─ syncPendingDataIfOnline() — mutation queue, sales batch, etc.
```

### Gating mechanisms

| Layer | Mechanism | File |
|-------|-----------|------|
| **HTTP** | Request interceptor calls `ensureServerSession()` before non-auth requests | `axiosConfig.ts` |
| **React Query** | `onlineManager.setOnline(true)` delayed until upgrade finishes | `useSyncQueryOnlineStatus.ts` |
| **Sync hook** | `await upgradeLocalSessionIfOnline()` before `syncPendingDataIfOnline()` | `useOfflineSync.ts` |
| **Early boot** | Hydrated local session + online → upgrade on load | `AuthBootstrap.tsx` |
| **After offline login** | If network already back → upgrade immediately | `AccountQueries.ts` |
| **401 safety** | No forced logout while upgrade active, session needs upgrade, or `localSessionRequest` tag | `axiosConfig.ts` |

### Exemptions (do not wait on upgrade)

- `POST /auth/login`, register endpoints
- Connectivity probe (`GET /sales` with `skipSessionUpgrade: true`)
- Any request with `skipSessionUpgrade: true` on config

### Upgrade steps (inside `sessionUpgrade.ts`)

1. Skip if offline, already server token, or `pendingAuthSync` (registration)
2. If auth mutations queued → `syncAuthMutations()` → `applyServerAuth()`
3. Else `POST /auth/login` with encrypted device password
4. `applyServerAuth()` → `isLocalSession=false`, `pendingAuthSync=false`
5. `postSessionUpgradeRefresh()` — profile, catalog snapshots, query invalidation, active shift

No toast for routine device-login upgrade. Registration sync still shows success/error toasts.

## Auth sync engine

`syncAuthEngine.ts` processes queued:

- `POST /businesses/register` → register + login + optional ID remap
- `POST /auth/login` → `applyServerAuth()`

Uses `authSessionApply.ts` → `persistLoginCredentials()` + `loginSuccess()` + `postSessionUpgradeRefresh()`.

## Logout

`performAppLogout.ts`:

- Clears Redux auth, React Query, encrypted session
- **Keeps** device credentials, catalog snapshots, mutation queue policy (queue persists unless cleared separately)
- Does not revoke server token when local session

## Manual tests

### Device offline login (no pending banner)

1. Sign in online once.
2. Log out → go offline → sign in with same credentials.
3. Confirm no `AuthPendingBanner`.
4. Restore internet — user stays in app, session upgrades silently, profile/shift refresh.

### Pending registration

1. Register offline (new business).
2. Confirm `AuthPendingBanner` shows.
3. Reconnect — registration syncs; banner clears after `applyServerAuth`.

### Legacy session fix

1. User with old localStorage-only session loads app.
2. `normalizeStoredSession` sets `pendingAuthSync: false` for `device_login` records in `localAuth`.

## Key files

| Path | Role |
|------|------|
| `shared/api/account/AccountQueries.ts` | Login/register mutations |
| `offline/auth/completeOfflineLogin.ts` | Offline login completion |
| `offline/auth/completeOfflineRegistration.ts` | Offline registration |
| `offline/auth/deviceCredentials.ts` | Persist session + device auth record |
| `offline/auth/deviceLoginSecrets.ts` | Encrypted password for silent upgrade |
| `offline/auth/secureStorage.ts` | Encrypted session + `normalizeStoredSession` |
| `offline/auth/sessionUpgrade.ts` | `upgradeLocalSessionIfOnline` |
| `offline/auth/authSessionApply.ts` | `applyServerAuth` |
| `offline/auth/sessionRefresh.ts` | Post-upgrade cache + active shift |
| `offline/auth/syncAuthEngine.ts` | Queued auth mutation processing |
| `app/components/AuthBootstrap.tsx` | Hydrate + normalize on boot |
| `app/store/hooks/useOfflineSync.ts` | Reconnect upgrade trigger |

Paths are relative to `src/renderer/app/store/` unless noted (`shared/`, `app/components/`).

# Business Data Export + Account Self-Deletion

**Date:** 2026-07-18

## Status

Accepted

## Context

Business owners need a way to:
1. Export all their business data for backup, migration, or record purposes
2. Permanently delete their business account (self-service, not just platform-admin-only)

Previously, business deletion was only available via platform admin (`DELETE /api/v1/platform/businesses/{id}`). There was no export endpoint and no self-service deletion.

## Decision

### Backend

**Export API** (`GET /api/v1/businesses/export`)
- Returns a full JSON object keyed by entity type (`business`, `products`, `customers`, `sales`, etc.)
- Supports `?format=json` (default), `csv`, `xlsx`
- CSV/XLSX delegates to existing `ReportExportService`
- Owner-only (403 for staff)
- Route under `auth:sanctum + business.active + module:settings` middleware

**Self-Deletion API** (`DELETE /api/v1/businesses/account`)
- Body: `{ "password": "..." }` — verifies owner's password via `Hash::check()`
- Calls `PlatformBusinessService::resetBusinessData()` to hard-delete all transactional data
- Then `$business->delete()` (soft-delete)
- Then `$user->currentAccessToken()->delete()` (revokes session)
- Returns `{ message, logged_out: true }`
- Owner-only (403 for staff)
- 422 for wrong password
- Route under same middleware as export

### Frontend

**Data & Export Page** (`/settings/data-export`)
- Card-based premium UI with format selector (JSON / CSV / XLSX)
- Two-step flow: select format → confirm → download triggers automatically
- Shows what's included (20 entity types)
- Owner-only warning banner
- Online-only (blocked when offline — shows disabled button)
- Sidebar nav item under Settings (auto-picked by tour + mobile nav)

**Danger Zone** (`/settings/business`)
- Red-bordered card at bottom of business settings
- Two-step deletion modal:
  1. Warning list of what will be deleted + "I understand" checkbox
  2. Type `/reset {slug}` to confirm + password entry
- On success: invalidates all queries, shows toast, redirects to `/login`

## Consequences

- Owners can now self-serve data export and account deletion
- Self-deletion uses the same data-reset pattern as platform admin reset-data endpoint
- All user tokens are revoked on deletion, forcing logout
- Staff cannot export or delete (403 from backend)
- Export is online-only (setting is marked in `onlineOnlyNav.ts`)
- The sidebar entry auto-participates in the product tour and mobile navigation
- No offline queueing for either operation (both require connectivity)

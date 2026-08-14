# ADR: Staff drawer module access parity with Module Access

**Date:** 2026-07-08  
**Status:** Accepted  
**Owners:** Mike (orchestration), Rex (FE/BE), Quill (docs)

## Context

Editing staff in `StaffFormDrawer` did not reliably update the logged-in user’s sidebar after module changes, especially for the **business owner**. The Staff Module access UI also drifted from the Settings → **Module access** standard (Settings required, shared copy, full workspace toggle).

## Decision

1. **Owner modules from Staff update are persisted.** Backend `UserService::validateModulesUpdate` no longer strips `modules` for the business owner. Owner payloads use `normalizeOwnerModules()` (Settings always included). Owner module updates change **that owner’s** catalog only - they do **not** cascade-clamp staff (see ADR 2026-07-14-owner-module-toggles-no-staff-revoke).
2. **Owner email is read-only in Staff drawer.** Frontend disables the email field for the owner account; backend rejects email changes for the owner from the staff update path.
3. **Settings is required only for the business owner account.** In Staff drawer, Settings is locked with a **Required** badge when editing the owner (same as Module Access). For regular staff create/edit, Settings is a normal optional checkbox. Backend `normalizeOwnerModules()` still injects Settings for owners; `normalizeStaffModules()` does not force it for staff.
4. **Sidebar refresh on self-edit.** When the updated user is the current session user, Staff update success refreshes auth via `/auth/me` (and falls back to the update response modules) and persists the auth user locally so the sidebar recomputes immediately.

## Consequences

- Owners can change which sections appear in **their** sidebar from Staff drawer; Module Access page remains the dedicated owner surface for the same catalog.
- Regular staff may be created/edited without Settings; Settings is only forced for the owner account.
- Owner email changes (if ever needed) must go through a dedicated profile/admin path, not Staff drawer.

## Failure states

| Case | Behavior |
|------|----------|
| Owner module save succeeds, `/me` fails | Fallback applies modules from the staff update response + local secure storage |
| Owner email sent in payload | Backend validation error; FE never sends a changed owner email |
| Staff offline module update | Local staff record stores modules as selected; Settings is optional |
| Owner removes a module staff still have | Staff grants are unchanged; owner personal catalog shrinks only |

## Key files

| Area | Path |
|------|------|
| Staff drawer UI | `src/renderer/modules/settings/ui/StaffFormDrawer.tsx` |
| Module helpers | `src/renderer/shared/utils/moduleAccess.ts` |
| Staff mutations / auth refresh | `src/renderer/modules/settings/api/settings/StaffQueries.ts` |
| Owner Module Access UI | `src/renderer/modules/settings/ui/OwnerModuleAccessForm.tsx` |
| Backend user update | `Backend/app/Services/UserService.php` |
| Backend module normalize | `Backend/app/Services/ModuleAccessService.php` |

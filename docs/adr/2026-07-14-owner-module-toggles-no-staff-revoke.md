# ADR: Owner module toggles do not revoke staff grants

**Date:** 2026-07-14  
**Status:** Accepted  
**Scope:** Frontend + Backend (module access)

## Context

When a business owner toggled modules off in Settings → Module access (their personal catalog), `clampStaffModulesAfterOwnerUpdate` rewrote every staff `users.modules` row down to the owner’s catalog. Staff lost modules the owner had previously assigned - even though create/attach already allowed granting modules the owner does not personally use.

## Decision

1. **Owner Module access = personal workspace visibility only.** Saving owner modules via `PUT /auth/profile` or staff PUT on the owner account updates **that owner only**.
2. **No cascade.** Removed `clampStaffModulesAfterOwnerUpdate` and its call sites. Staff keep assigned modules until changed in Staff (create/edit/detach).
3. **Assignable catalog stays full business catalog** (`assignableStaffModuleSlugs` returns all business modules). Owners can grant tools they do not themselves open.
4. **Copy clarified** on Module access: turning something off does not remove it from the team.

## Failure states

| Case | Behavior |
|------|----------|
| Owner turns off Inventory; staff had Inventory | Staff keep Inventory |
| Owner turns module off for themselves | Only owner sidebar/API for that user changes |
| Staff grant change | Only via Staff form checkboxes (or detach) |

## Related

- Supersedes cascade row in [2026-07-08-staff-drawer-module-access-parity.md](./2026-07-08-staff-drawer-module-access-parity.md)
- Board import sample data: [2026-07-14-board-card-import-sample-formats.md](./2026-07-14-board-card-import-sample-formats.md)

# ADR: Navbar module launcher

**Date:** 2026-07-11  
**Status:** Accepted

## Context

Users needed a fast way to jump between modules without digging through the sidebar. Visibility must match what each person can already access (staff form drawer modules, owner module access, always-on Account/Guide, and platform tiles for platform admins). Project collaborators who only have Estimates boards access must see that tile too (same as the sidebar).

## Decision

1. Add a 9-dot **Apps** control in the navbar **left of Guide**.
2. Open a shared **`Modal`** (same pattern as Pipeline/Projects “Switch boards”), not a Google-style popover.
3. Grid tiles are filtered per user via `getAccessibleModules` + `hasEstimatesBoardsAccess`.
4. Each tile navigates to the module’s default route (limited Estimates/HR land on boards/attendance).
5. Keep the sidebar unchanged for deep navigation.

## Consequences

- Each user sees a different module set in the modal.
- No backend change; auth `modules` remains the source of truth.
- Catalog lives in `moduleLauncherCatalog.ts` so icons/labels stay in one place.

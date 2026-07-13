# ADR: Staff form modal and module checkbox hydration

**Date:** 2026-07-13  
**Status:** Accepted

## Context

Settings → Staff edit used a slide drawer. Opening a person often showed module checkboxes unchecked even when they had access, because the form hydrated once from a frozen list-row snapshot (sometimes missing `modules`) and refused to rehydrate for the same id.

## Decision

1. Replace `SlideDrawer` with the shared `Modal` + HR-style section heroes (`HrModalHero` / `HrFormSection`).
2. Extract form logic to `useStaffForm.ts`.
3. Hydrate from live list row by id, and on edit always `GET /users/{id}` so checkboxes match persisted modules.
4. Rehydrate when the modules signature changes (not only when the staff id changes).

## Key files

- `src/renderer/modules/settings/ui/StaffFormModal.tsx`
- `src/renderer/modules/settings/ui/useStaffForm.ts`
- `src/renderer/modules/settings/ui/StaffList.tsx`

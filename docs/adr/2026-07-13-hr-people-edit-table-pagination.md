# ADR: HR People edit locks, table, and detach

**Date:** 2026-07-13  
**Status:** Accepted  
**Owners:** Mike (orchestration), Rex (FE/BE), Quill (docs)

## Context

HR People used a raw HTML table without pagination or row actions. Profile edit allowed changing the HR contact email even though login email/password must stay immutable after create (change access via create-account / attach / detach only).

## Decision

1. **Editable from HR profile:** name, employee number, status, phone, department, position, manager, employment type, hire/termination dates, notes.
2. **Not editable from HR profile:** email (read-only display of login or HR email), password (no field). Backend `PATCH /hr/employees/{id}` no longer accepts `email`.
3. **People list** uses shared `Table` + client `usePagination` (default 15, same pattern as Sales history / Settings Staff) with Edit and Detach actions. Detach calls existing `POST .../remove-account` when a login is linked.
4. Create modal extracted to `HrAddEmployeeModal` so email may still be set at create time.

## Failure states

| Case | Behavior |
|------|----------|
| Detach with no login | Action disabled |
| Detach owner / self | Backend 422; toast surfaces message |
| Save profile with email in payload | Ignored (not in validation rules) |
| Empty filtered list | Empty state; pagination hidden |

## Key files

- `Frontend/src/renderer/modules/hr/pages/HrPeoplePage.tsx`
- `Frontend/src/renderer/modules/hr/ui/HrAddEmployeeModal.tsx`
- `Frontend/src/renderer/modules/hr/pages/HrEmployeeDetailEditor.tsx`
- `Backend/app/Http/Controllers/Api/Hr/HrEmployeeController.php`

# HR & Payroll module

Frontend module for people operations, time & leave, Uganda-first payroll, talent, and statutory reports.

## Entry points

| UI | Path |
|----|------|
| Module shell | `/hr` → redirects to People |
| People directory | `/hr/people` |
| Employee detail | `/hr/people/:employeeId` |
| Departments | `/hr/departments` |
| Attendance | `/hr/attendance` |
| Leave | `/hr/leave` |
| Payroll | `/hr/payroll` |
| Pay run detail | `/hr/payroll/runs/:payRunId` |
| Talent | `/hr/talent` |
| Reports | `/hr/reports` |
| HR settings | `/hr/settings` |

Access is gated by `ModuleAccessMiddleware` with slug `hr` (same pattern as Documents / Accounting).

## Architecture

```
pages/  → React Query hooks (useHrQueries) → axiosInstance → /api/v1/hr/*
```

| Layer | Files |
|-------|--------|
| Endpoints | `api/hrEndpoints.ts` |
| Types | `api/hrTypes.ts` |
| Query keys | `api/hrQueryKeys.ts` |
| Hooks | `api/useHrQueries.ts` |
| Shell | `pages/HrLayout.tsx` — frosted left sidenav (~240px) |
| Shared UI | `ui/HrSurface.tsx`, `ui/HrStatusBadges.tsx` |

## Identity model

- **HR employee** is the payroll/people record (`hr_employees`).
- Optional **`user_id`** links to Settings → Staff (`User`) for app login — no duplicate accounts.
- Link/unlink from the employee detail page via `POST /hr/employees/{id}/link-user`.

## Integrations

| System | Behavior |
|--------|----------|
| **Settings Staff** | Link/unlink `user_id` on employee profile |
| **Estimates timesheets** | Attendance → “Import approved timesheets” mirrors approved hours into HR day minutes (project costing stays on timesheets) |
| **POS Shifts** | Attendance shows read-only sales-floor shifts for linked users (not merged with HR clock) |
| **Accounting** | Pay-run post debits 6101 / credits 2103 when available; otherwise stores intended lines in `posting_note` |
| **Documents** | Seeded HR cabinet remains the file home for contracts/policies |

## Payroll flow

1. Create salary structure (currency default UGX).
2. Assign compensation (basic salary + effective date).
3. Create pay run for a period.
4. **Calculate** → lines with gross, PAYE, NSSF employee/employer, net.
5. **Approve** → **Post** (idempotent; may create accounting journal when backend supports it).
6. View PAYE / NSSF schedules under Reports.

## Failure states

| Situation | UX |
|-----------|-----|
| Validation / API error | Toast via `sanitizeErrorMessage` on mutation `onError` |
| Destructive delete | `useConfirm` before department, position, employee, or pay-run post |
| Empty lists | Guided empty states with primary CTA |
| Missing report filter | Reports page waits until pay run or date range is set |
| No HR module access | Middleware redirects / blocks like other modules |

## Related docs

- ADR: [2026-07-10-hr-payroll-module.md](../adr/2026-07-10-hr-payroll-module.md)
- Module access: `src/renderer/shared/utils/moduleAccess.ts` (`hr` slug)

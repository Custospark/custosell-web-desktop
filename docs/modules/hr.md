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
| Shell | `pages/HrLayout.tsx` — outlet-only; navigation lives in the main app Sidebar (HR & Payroll group) |
| Shared UI | `ui/HrSurface.tsx`, `ui/hrFormFields.tsx`, `ui/HrAppLoginFields.tsx`, `ui/HrStatusBadges.tsx` |

## Identity model

- **HR employee** is the payroll/people record (`hr_employees`).
- Optional **`user_id`** links to Settings → Staff (`User`) for app login — one person, one account.
- **Auto-mirror:** Creating staff in Settings creates a linked HR employee (`STF-{userId}`). Opening People (`GET /hr/employees`) backfills any staff still missing a profile. Artisan: `hr:backfill-staff-employees`.
- **Create from HR:** People → Add employee can create an HR-only profile **or** `POST /hr/employees/with-account` (admin/HR sets password, role, modules).
- **Existing employee login:** `POST /hr/employees/{id}/create-account`, link via `link-user`, disconnect via `unlink-user` (keeps User), or `remove-account` (soft-deletes User).
- **Delete employee:** optional `remove_account=1` also removes the staff login.
- **Password:** Admin/HR sets password on create (same as Settings staff drawer). No invite email in v1. HR with-account is online-first.

## Integrations

| System | Behavior |
|--------|----------|
| **Settings Staff** | Create staff → auto HR employee; delete staff → HR profile remains (No login); soft-sync name/email/phone onto linked employee on staff update |
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
| Duplicate email on with-account | Field/API error; no orphan employee (transaction) |
| Remove login for business owner | Blocked by UserService delete guards |
| Destructive delete | `useConfirm` before department, position, employee, or pay-run post; employee delete asks about login |
| Empty lists | Guided empty states with primary CTA |
| Missing report filter | Reports page waits until pay run or date range is set |
| No HR module access | Middleware redirects / blocks like other modules |
| Offline HR account create | Online-first — use Settings staff create (queued) if offline |

## Related docs

- ADR: [2026-07-10-hr-payroll-module.md](../adr/2026-07-10-hr-payroll-module.md)
- Module access: `src/renderer/shared/utils/moduleAccess.ts` (`hr` slug)

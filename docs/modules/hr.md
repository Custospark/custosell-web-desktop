# HR & Payroll module

Frontend module for people operations, time & leave, Uganda-first payroll, talent, and statutory reports.

## Entry points

| UI | Path |
|----|------|
| Module shell | `/hr` → People (full) or Attendance (limited) |
| People directory | `/hr/people` |
| Employee detail | `/hr/people/:employeeId` |
| Departments | `/hr/departments` |
| Attendance | `/hr/attendance` — clock capture + hours/presence charts over 7/30 days |
| Leave | `/hr/leave` |
| Payroll | `/hr/payroll` |
| Pay run detail | `/hr/payroll/runs/:payRunId` |
| Talent | `/hr/talent` (`?employee_id=` / `?user_id=` deep links) |
| Reports | `/hr/reports` |
| HR settings | `/hr/settings` |

Access is gated by `ModuleAccessMiddleware` with slug `hr`, plus `HrAccessMiddleware` for the optional `hr_full` addon:

| Access | Modules | UI routes | Typical API |
|--------|---------|-----------|-------------|
| **Full** | `hr` + `hr_full` | All `/hr/*` | Org, people admin, payroll, reports, leave approve |
| **Limited** | `hr` only | Attendance, Leave, Talent | Clock self, leave request/cancel, talent task update, own work performance |

Owners follow the same rule as staff: without `hr_full`, the Sidebar shows only Attendance / Leave / Talent and admin HR APIs return 403. Saving Module access (or editing your own staff modules) refreshes the auth user so the Sidebar updates immediately.

See [ADR: HR full vs limited module access](../adr/2026-07-10-hr-full-module-access.md) and [ADR: Work performance from Pipeline/Projects](../adr/2026-07-10-hr-work-performance-from-pipeline.md).

## Work performance (Pipeline / Projects → Talent)

Evaluates whether linked staff are meeting goals using live work data (no separate HR goals table):

| Signal | Source |
|--------|--------|
| Board goals | Member-scoped `pipeline_board_targets` (actual vs target + pace) |
| Pipeline cards/leads | Assigned via `assigned_to` or multi-assignee pivot |
| Project tasks | `project_tasks.assigned_to` on business projects |

| API | Access |
|-----|--------|
| `GET /hr/talent/performance` | Roster (full) or self (limited) |
| `GET /hr/talent/performance/employees/{id}` | Full any; limited self only |
| `GET /hr/talent/performance/by-user/{userId}` | Deep link from board assignees |
| `POST …/seed-review` | Full HR — draft review from snapshot |

**UI:** Talent → Work performance; People → employee detail; Pipeline lead detail + Project task assignee → **Evaluate performance**.

**Failure states:** unlinked employee → `unlinked` verdict + CTA to link login; API error → retry; limited user viewing another → 403; seed without link → 422.

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
| Shared UI | `ui/HrSurface.tsx`, `ui/hrFormFields.tsx`, `ui/HrAppLoginFields.tsx`, `ui/HrStatusBadges.tsx`, `ui/HrWorkPerformancePanel.tsx`, `ui/EvaluateStaffPerformanceLink.tsx`, `ui/talentSurface.ts` (Progress-style frosted canvas) |

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
| Limited HR on admin route | `HrAccessMiddleware` redirects to Attendance |
| Clock/leave for another employee (limited) | API 403 — forced to linked employee |
| Offline HR account create | Online-first — use Settings staff create (queued) if offline |

## Related docs

- ADR: [2026-07-10-hr-payroll-module.md](../adr/2026-07-10-hr-payroll-module.md)
- Module access: `src/renderer/shared/utils/moduleAccess.ts` (`hr` slug)

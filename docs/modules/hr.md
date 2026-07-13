# HR & Payroll module

Frontend module for people operations, time & leave, Uganda-first payroll, talent, and statutory reports.

## Entry points

| UI | Path |
|----|------|
| Module shell | `/hr` → Overview (full) or Attendance (limited) |
| Overview dashboard | `/hr/overview` — full access only |
| People directory | `/hr/people` |
| Employee detail | `/hr/people/:employeeId` |
| Departments | `/hr/departments` |
| Company Assets | `/hr/company-assets` |
| Company Asset detail | `/hr/company-assets/:assetId` |
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
| **Full** | `hr` + `hr_full` | All `/hr/*` including Overview dashboard | Org, people admin, payroll, reports, leave approve |
| **Limited** | `hr` only | Attendance, Leave, Talent | Clock self, leave request/cancel, talent task update, own work performance |

Owners follow the same rule as staff: without `hr_full`, the Sidebar shows only Attendance / Leave / Talent and admin HR APIs return 403. Saving Module access (or editing your own staff modules) refreshes the auth user so the Sidebar updates immediately.

See [ADR: HR full vs limited module access](../adr/2026-07-10-hr-full-module-access.md) and [ADR: Work performance from Pipeline/Projects](../adr/2026-07-10-hr-work-performance-from-pipeline.md).

## Work performance (Pipeline / Projects → Talent)

Evaluates whether linked staff are meeting goals using live work data (no separate HR goals table):

| Signal | Source |
|--------|--------|
| Board goals | Member-scoped `pipeline_board_targets` — Talent period chips show **x/y** vs period `expected_value` (e.g. Today `1/2`), not only the overall target |
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
| Company Assets API | `api/hrCompanyAssetsEndpoints.ts`, `api/hrCompanyAssetsKeys.ts`, `api/useHrCompanyAssetsQueries.ts` |
| Shell | `pages/HrLayout.tsx` — outlet-only; navigation lives in the main app Sidebar (HR & Payroll group) |
| Shared UI | `ui/HrSurface.tsx`, `ui/hrFormFields.tsx`, `ui/HrAppLoginFields.tsx`, `ui/HrStatusBadges.tsx`, `ui/HrWorkPerformancePanel.tsx`, `ui/HrEmployeeAssetsPanel.tsx`, `ui/HrCompanyAssetModals.tsx`, `ui/EvaluateStaffPerformanceLink.tsx`, `ui/talentSurface.ts` (Progress-style frosted canvas) |

## Identity model

- **HR employee** is the payroll/people record (`hr_employees`).
- Optional **`user_id`** links to Settings → Staff (`User`) for app login — one person, one account.
- **Auto-mirror:** Creating staff in Settings creates a linked HR employee (`STF-{userId}`). Opening People (`GET /hr/employees`) backfills any staff still missing a profile. Artisan: `hr:backfill-staff-employees`.
- **Create from HR:** People → Add employee can create an HR-only profile **or** `POST /hr/employees/with-account` (admin/HR sets password, role, modules).
- **Existing employee login:** `POST /hr/employees/{id}/create-account` (create-or-attach via BE `resolveStaffAccount`), link via `link-user`, disconnect via `unlink-user` (keeps User on org; clears HR link only), or `remove-account` (**detaches** from organization — login stays, org membership cleared).
- **Delete employee:** optional `remove_account=1` also **detaches** the staff login from this organization (does not delete the user).
- **Password:** Admin/HR sets password on create (same as Settings staff drawer). No invite email in v1. HR with-account is online-first. Other-org emails return **409** (surfaced via `sanitizeErrorMessage`).

## Integrations

| System | Behavior |
|--------|----------|
| **Settings Staff** | Create/attach staff → auto HR employee; detach staff → HR profile remains (No login); soft-sync name/email/phone onto linked employee on staff update |
| **Estimates timesheets** | Attendance → “Import approved timesheets” mirrors approved hours into HR day minutes (project costing stays on timesheets) |
| **POS Shifts** | Attendance shows read-only sales-floor shifts for linked users (not merged with HR clock) |
| **Accounting** | Pay-run **Post** creates accrual JE (Dr 6101 / Cr 2110–2112). **Settle** and **Remit statutory** clear liabilities vs Bank. **Void** reverses linked journals. Fail-hard: no journal → stay `approved` + `posting_note`. See [ADR: payroll accounting bridge](../adr/2026-07-10-hr-payroll-accounting-bridge.md). **Company Assets** share the `fixed_assets` register with Accounting Fixed Assets (custody in HR; depreciation/GL in Accounting). See [ADR: company assets](../adr/2026-07-11-company-assets-hr-accounting.md) |
| **Expenses** | Optional `fixed_asset_id` on maintenance/repair expenses; rollup on Company Asset detail |
| **Documents** | Seeded HR cabinet remains the file home for contracts/policies |

## Payroll flow

1. Create salary structure (currency default UGX) — full HR can edit/delete structures.
2. Assign compensation (basic salary + effective date) — soft-delete removes it from future calculations (`latestCompensation` skips soft-deleted rows); past pay lines stay.
3. Create pay run for a period — draft period can be patched; draft/calculated runs can be deleted (lines + payslips hard-deleted).
4. **Calculate** → lines with gross, PAYE, NSSF employee/employer, net.
5. **Approve** → **Post** (fail-hard accrual journal; retry if legacy soft-fail).
6. **Mark net paid** (optional) → settlement journal vs Bank.
7. **Remit PAYE & NSSF** (optional) → statutory remittance journal vs Bank.
8. **Void** (if needed) → reverse linked journals, status `void`.
9. View PAYE / NSSF schedules under Reports.
10. Check **Payroll cash runway** on Reports (cash vs unpaid 2110–2112 vs monthly burn; hire what-if).

## Leave edit / cancel

| Action | Who |
|--------|-----|
| Create / edit / delete leave types | Full HR (`hr_full`) |
| Approve / reject requests | Full HR |
| Cancel pending or approved request | Full HR (any) or limited HR (own linked employee only) |
| Request leave | Full HR (any employee) or limited HR (self) |

## Failure states

| Situation | UX |
|-----------|-----|
| Validation / API error | Toast via `sanitizeErrorMessage` on mutation `onError` |
| Duplicate / other-org email on with-account or create-account | Validation or **409** toast via `sanitizeErrorMessage`; no orphan employee (transaction) |
| Detach business owner / self | Blocked by staff membership detach guards |
| Destructive delete | `useConfirm` before department, position, employee, leave type, structure, compensation, pay-run delete/post; employee delete asks about org detach |
| Empty lists | Guided empty states with primary CTA |
| Missing report filter | Statutory PAYE/NSSF waits until pay run or date range is set |
| No accounting period for runway | API 422; panel shows create-period guidance |
| Employees without compensation | Runway warning; burn excludes them; count in `employees_missing_compensation` |
| Zero burn / unknown status | Coverage status `unknown` — cannot project months |
| Hire what-if invalid salary | Client + API validation (salary &gt; 0) |
| No HR module access | Middleware redirects / blocks like other modules |
| Limited HR on admin route | `HrAccessMiddleware` redirects to Attendance |
| Clock/leave for another employee (limited) | API 403 — forced to linked employee |
| Cancel another employee's leave (limited) | API 403 |
| Offline HR account create | Online-first — use Settings staff create (queued) if offline |
| Payroll post without open period / COA | 422; run stays `approved`; `posting_note` explains; Retry post |
| Void with closed period | 422; journals unchanged; toast shows accounting error |
| Assign already-assigned asset | 422 — transfer or return first |
| Return unassigned asset | 422 |
| Dispose while assigned | 422 — return first |
| Invalid `fixed_asset_id` on expense | 422 |
| Delete non-draft/calculated pay run | 422 |

## Related docs

- ADR: [2026-07-10-hr-payroll-module.md](../adr/2026-07-10-hr-payroll-module.md)
- ADR: [2026-07-10-hr-payroll-accounting-bridge.md](../adr/2026-07-10-hr-payroll-accounting-bridge.md)
- ADR: [2026-07-13-staff-detach-attach.md](../adr/2026-07-13-staff-detach-attach.md)
- ADR: [2026-07-10-payroll-affordability-cash-runway.md](../adr/2026-07-10-payroll-affordability-cash-runway.md)
- Module access: `src/renderer/shared/utils/moduleAccess.ts` (`hr` slug)

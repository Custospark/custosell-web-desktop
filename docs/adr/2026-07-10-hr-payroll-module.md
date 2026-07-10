# ADR-2026-07-10: HR & Payroll module

**Status:** Approved

**Date:** 2026-07-10

**Authors:** Custospark Product Development Team

## Context

Custosell businesses need people operations beyond Settings → Staff: org structure, attendance, leave, Uganda statutory payroll (PAYE / NSSF), onboarding, and reviews. Staff login accounts already exist as `User` records; HR must not invent a second identity system.

## Decision

Ship a first-class **`hr`** module labeled **HR & Payroll** with:

1. **Frontend** under `src/renderer/modules/hr/` — outlet-only `HrLayout` (no in-module sidenav), React Query API layer against `/api/v1/hr/*`, pages for People, Departments, Attendance, Leave, Payroll, Talent, Reports, and Settings.
2. **Identity** — `hr_employees.user_id` optionally links to Staff users. **Auto-mirror:** every staff `User` gets a linked HR employee (on Settings create + People list backfill). Admin/HR may create logins from HR (`with-account` / `create-account`) with an admin-set password (no invite email in v1). Unlink keeps the User; remove-account soft-deletes the User.
3. **Payroll locale** — Uganda-first (UGX, progressive PAYE, NSSF 5%/10%) with extensible statutory rate sets on the backend.
4. **UI shell** — App Sidebar group (already registered) is the sole HR navigation; `HrLayout` renders `<Outlet />` only. Pages match Documents/Pipeline surface quality (`HrSurface`, `hrFormFields`, status badges, empty states, Confirm + Toast).
5. **Module access** — same `ModuleAccessMiddleware` / `BUSINESS_MODULE_SLUGS` pattern as Documents and Accounting.

## Consequences

### Positive

- One place for people ops and pay without leaving Custosell.
- Clear separation: Staff = login/access; Employee = employment/payroll record.
- Pay run lifecycle (draft → calculated → approved → posted) supports audit and accounting integration.
- Statutory report views support URA/NSSF operational workflows.

### Negative

- Payroll rules are jurisdiction-sensitive; non-UG locales need future rate packs.
- Posting to Accounting depends on COA liability accounts existing; backend may soft-fail journal creation while still marking the run posted.
- Offline-first mutation queue for HR is deferred — HR is online-primary in v1.

## Alternatives considered

### Extend Settings → Staff only

**Rejected.** Staff is auth/access oriented; payroll, leave balances, and attendance need dedicated entities and workflows.

### Separate `payroll` module

**Rejected.** Split would fragment leave/attendance from pay and duplicate navigation. Dual label **HR & Payroll** under slug `hr` covers both.

### Third-party HRIS

**Rejected.** Conflicts with offline-first product direction and keeps sensitive payroll data outside the Custosell business boundary.

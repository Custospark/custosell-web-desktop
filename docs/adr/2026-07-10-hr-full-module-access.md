# ADR-2026-07-10: HR full vs limited module access

**Status:** Approved (amended)

**Date:** 2026-07-10

**Authors:** Custospark Product Development Team

## Context

The `hr` module previously granted the same API and UI surface to every user with the `hr` slug. Businesses need staff who can clock attendance, request leave, and update their own talent tasks without administering people, payroll, or org structure. This mirrors the existing `estimates` / `estimates_full` split.

## Decision

1. **Addon slug `hr_full`** - assignable alongside base `hr`. Normalized like `estimates_full` (implies base `hr`; owner must hold `hr_full` to grant it to staff).
2. **Full workspace requires `hr_full` for everyone** - including business owners. Same rule as `estimates_full`: sidebar, route middleware, and `hr.full` APIs key off the stored slug, not ownership. New businesses seed `hr_full` with the full owner module set. Backfill migration for existing owners who already have `hr`.
3. **Backend** - `module:hr` on the HR route group; admin routes wrapped with `hr.full` (`hasFullHrWorkspace` only). Limited users may clock/request leave only for their linked `HrEmployee`; mismatch or missing link → 403.
4. **Frontend** - `HrAccessMiddleware` limits limited users to `/hr/attendance`, `/hr/leave`, `/hr/talent`. Sidebar shows only those three items when `hr` is present without `hr_full`. Staff/owner module forms expose a nested “Full HR & Payroll workspace” checkbox (default off for new staff grants). Saving module access refreshes auth user so the sidebar updates immediately.

## Consequences

### Positive

- Clear self-service vs admin boundary without a second module slug for attendance/leave.
- Consistent with Projects & Estimates: toggling full access updates the sidebar for the current user after save.
- Owners can intentionally run a minimal HR nav for themselves when testing or preferring self-service only.

### Negative

- Owners who only have base `hr` (no `hr_full`) lose admin HR APIs until they enable Full HR in Module access.
- Leave type **mutations** stay admin-only; **GET** leave types remains available so limited users can submit requests.

## Alternatives considered

### Owners always full (previous amendment)

**Rejected after product feedback.** It prevented the sidebar from reflecting minimal vs full when the owner saved module access, and diverged from the estimates pattern.

### Separate `hr_self` module

**Rejected.** Doubles catalog noise; base `hr` + optional `hr_full` matches estimates.

### Role permissions instead of module addon

**Rejected.** Module access is the product source of truth for navigation and API gates.

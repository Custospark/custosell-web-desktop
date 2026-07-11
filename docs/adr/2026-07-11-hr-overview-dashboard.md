# ADR: HR overview dashboard (full access)

**Date:** 2026-07-11  
**Status:** Accepted

## Context

Full HR users landed on People with no single-page pulse across attendance, leave, payroll, talent, and cash runway. Limited HR users must stay on self-service routes only.

## Decision

1. Add `/hr/overview` (`HrOverviewPage`) for **`hr_full`** users only.
2. Style KPI strip like the main POS Dashboard; body sections use existing `HrPageHeader` / `HrSectionCard`.
3. Aggregate from existing list hooks (no new backend summary endpoint in v1).
4. `getHrModuleDefaultRoute` → Overview when full, Attendance when limited.
5. Sidebar shows Overview first under HR & Payroll for full access only (limited sub-nav unchanged).

## Consequences

- Module launcher and `/hr` index redirect to Overview for full HR.
- Limited users hitting `/hr/overview` are redirected by `HrAccessMiddleware`.

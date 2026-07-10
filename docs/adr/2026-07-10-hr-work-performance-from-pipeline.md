# ADR-2026-07-10: HR work performance from Pipeline/Projects

**Status:** Approved

**Date:** 2026-07-10

**Authors:** Custospark Product Development Team

## Context

Managers need to evaluate whether employees are meeting goals using the work already tracked on Pipeline boards (leads/cards + Progress targets) and Projects (tasks). HR Talent previously only had onboarding checklists and qualitative reviews — no quantitative bridge to that work.

## Decision

1. **Bridge via `HrEmployee.user_id`** — Pipeline/Projects assignees are staff users; evaluation requires a linked HR employee.
2. **Live aggregation API** under `/hr/talent/performance*` — roster, per-employee snapshot, by-user deep link, and optional seed of a draft `HrReview` from the snapshot. No new goals tables in HR.
3. **Verdict** prefers member board-goal pace (`on_track` / `at_risk` / `behind`); falls back to overdue leads/tasks and completion/win signals when no member goals exist.
4. **Entry points** — Talent Work performance panel, employee detail, and **Evaluate performance** links on Pipeline lead assignees and Project task assignees.
5. **Period x/y on Talent** — Talent period chips (Today / week / month…) drive `expected_value` for each member goal (e.g. day pace of 2 → show `1/2`). Overall `target_value` remains secondary context.

## Consequences

### Positive

- Reuses existing Progress/target math and work items.
- Full HR can seed review drafts without retyping metrics.
- Limited HR users can see their own snapshot only.

### Negative

- Unlinked employees cannot be evaluated until an app login is linked.
- Team-scoped (non-member) board targets are not attributed to individuals in this v1.

## Alternatives considered

### Duplicate goals inside HR

**Rejected.** Would drift from board Progress and double maintenance.

### Only qualitative reviews

**Rejected.** Does not answer “are they meeting goals?” from tasks/leads.

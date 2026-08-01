# Income & Expenses Overview freshness + guided expense form validation

**Date:** 2026-08-01

**Status:** Accepted

## Decision

1. **Income & Expenses Overview is always fresh.** `useIncomeOverview` uses `staleTime: 0`, `refetchOnMount: 'always'`, `refetchOnWindowFocus: 'always'` so totals, charts, and recent transactions reflect the latest records on load, mount, and window focus — no stale cache.
2. **Expense form guides users on required fields.** Recording an expense no longer silently disables Save. Required fields are clearly marked (`Amount *`, `Date *`, and now `Description *`), and submitting with missing data highlights the offending fields in red, shows inline messages, focuses the first invalid field, and shows an error banner — instead of a disabled button with no explanation.

## Why

Oscar: the Overview must never show stale data, and adding expenses was confusing because the disabled Save button gave no hint about which required fields were missing.

## What changed

- `src/renderer/modules/expenses/api/IncomeQueries.ts` — `useIncomeOverview` always-fresh query config.
- `src/renderer/modules/expenses/components/ExpenseForm.tsx` — added `validate()`, per-field `errors`, `attempted` flag, refs to focus the first invalid field, inline error messages, red highlight styling, `Description *` marker, and an error banner above the actions; Save stays enabled so validation feedback is always reachable.

## Consequences

- The Overview always reflects current data on visit/focus.
- Users are told exactly which required expense fields are missing and how to fix them.

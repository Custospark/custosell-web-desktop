# Business accounts: Income & Budgets in the "Income & Expenses" sidebar group

**Date:** 2026-08-01

**Status:** Accepted

## Decision

Business accounts now see **Income** and **Budgets** under the **Income & Expenses** sidebar group (previously both were filtered out for business accounts). The budget item is labelled **Budgets** on business accounts while personal accounts keep **My Budgets**.

## Why

Oscar requested that Budgets and Income appear under "Income & Expenses" on business accounts. The old logic in `resolveAccessibleNavLeaves.ts` removed `Income` and `My Budgets` for non-personal accounts.

## What changed

- `src/renderer/shared/components/layout/resolveAccessibleNavLeaves.ts` — the `Income & Expenses` business filter now renames `My Budgets → Budgets` instead of dropping Income + Budgets.
- `src/renderer/modules/expenses/MyBudgetsPage.tsx` — page header shows **Budgets** for business accounts, **My Budgets** for personal, matching the sidebar label.

Personal accounts are untouched (label stays **My Budgets**). Mobile leaves derive from the same resolver, so tabs stay consistent.

## Consequences

- Business accounts can reach `/expenses/income` and `/expenses/budgets` from the sidebar again.
- Business budgets page header matches the nav label ("Budgets").

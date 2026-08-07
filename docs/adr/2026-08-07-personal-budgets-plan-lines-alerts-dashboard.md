# ADR: Personal Budgets — Plan Lines, Recurring Income, Alerts & Money Dashboard

**Date:** 2026-08-07
**Status:** Accepted

## Context

Personal accounts could not budget their money — `income_target` was business-only and there was no way to create budgets for personal use. The user asked for a complete, in-sync personal budgeting/income/expense engine covering: a priced "shopping list" plan that auto-totals, recurring income, converting a plan item into a real expense, affordability recommendations, alerts, per-budget transaction views, and a money dashboard.

## Decisions

1. **`personal_budgets` + `budget_lines` tables** (new). A budget is a named goal pot ("Groceries", "June holiday", "Overall"). `planned_amount` auto-totals from its `budget_lines` (quantity × unit_price) when lines are synced.
2. **Legacy migration** — `Business.income_target` for personal accounts folds into a default **"Overall"** budget so there is one source of truth. Idempotent; personal accounts only.
3. **Recurring income** mirrors recurring expenses (`is_recurring`, `recurrence_interval`, `next_due_date`); service defaults `next_due_date` from the interval when omitted.
4. **Delete = unlink.** Deleting a budget sets `budget_id → NULL` on linked income/expenses (nullOnDelete) — records are kept.
5. **Convert plan → expense.** `POST /budgets/{id}/lines/{line}/purchase` creates an `Expense` (amount = line total, `budget_id` = budget) and marks the line `purchased` + `expense_id`.
6. **Affordability** compares plan remaining vs income available (incl. recurring income) and returns a human recommendation.
7. **Alerts** at ≥80% (near) and ≥100% (over) of planned spend; **money summary** aggregates income/spend/savings/planned totals for the dashboard.
8. **Blue design scheme** for all budget UI (blue-500/indigo-600 gradients); green/teal is not used in budget surfaces. Copy is personal ("Your money goals", "piggy banks"), not business.
9. All budget/income/expense mutations invalidate `budgetKeys.all` so summary, per-budget detail, and the money dashboard stay in sync.

## Consequences

- Personal budgets and their plan lines are now first-class; business accounts keep the business Forecasting engine and never see the personal budget routes (guarded by `PersonalIncomeMiddleware` + `module:expenses`).
- The engine answers "can I afford my plan / am I over budget / what's my net position" directly from the same income + expense records — no silos.

## Amendment (2026-08-07)

- **Money Summary merged into Overview.** The standalone `/expenses/money` page was removed. For personal accounts, `OverviewPage` now renders a `BudgetHealthSection` (affordability banner + up to 3 budget alerts + planned-across-budgets total) above the existing stat cards, charts, and recent transactions. `ROUTES.EXPENSES.MONEY` and the `MoneyDashboardPage` were deleted; the "Money summary" button on My Budgets now points to the Overview. Backend `/money/summary` and `/money/alerts` endpoints remain in use by `BudgetHealthSection`.
- **"Add item" opens a small modal.** `BudgetLinesEditor` shows plan lines as read-only list rows (name, qty × unit price, line total) with edit/remove controls; "Add item" opens a `Modal` to enter item name, quantity, and unit price with a live line-total preview.

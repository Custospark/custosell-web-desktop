# Forecasting module

Financial forecasting frontend for cash runway, budget vs actual, zero-based budgets, KPIs, and what-if scenarios. Backend lives under `/api/v1/forecasting/*` (module slug `forecasting`).

## Routes

| Path | Page |
|------|------|
| `/forecasting` | Redirect → overview |
| `/forecasting/overview` | HR-style dashboard — KPI strip, cash ladder, burn, BvA, quick links |
| `/forecasting/budgets` | Budget list + create year budget |
| `/forecasting/budgets/:budgetId` | Lines, justify/approve, roll, snapshots |
| `/forecasting/kpis` | Retail / SaaS KPI pulse |
| `/forecasting/scenarios` | Scenario CRUD + run comparison |

Guarded by `ModuleAccessMiddleware module="forecasting"`. Sidebar group **Forecasting** sits next to Accounting.

## API layer

`src/renderer/modules/forecasting/api/`

- `forecastingEndpoints.ts` — path constants
- `forecastingTypes.ts` — response / payload types matching backend services
- `forecastingQueryKeys.ts` — React Query keys
- `useForecastingQueries.ts` — overview, cash, BvA, budgets CRUD, justify/approve/roll, snapshots, KPIs, scenarios CRUD+run

## UI

HR-style surfaces in `ui/ForecastingSurface.tsx` + `forecastingSurfaceStyles.ts`. Status chips: coverage `healthy|tight|critical|unknown`, BvA `over|under|on_track`, ZBB `draft|justified|approved`. Assumptions and warnings panels stay visible on overview, KPIs, and scenario runs. All money amounts use `formatForecastMoney` → shared `formatCurrency` with the business configured currency (same as Sales / Inventory).

Overview **Cash ladder** table: `min-w-0` on the grid column + `overflow-x-auto` / `min-w-[44rem]` on the table so narrow viewports scroll horizontally inside the card instead of blowing out the layout.

## Product recurring (Phase 3)

`Product.is_recurring` + optional `billing_interval` on create/update (ProductFormDrawer). Enables SaaS KPI mode when recurring products exist.

## Accounting integration

Cash and unpaid payroll liabilities come from **GL closing balances** (1101/1102 and 2110–2112) for the selected accounting period — the same source as payroll affordability. Payroll burn is reused from `HrPayrollAffordabilityService` (no duplicate PAYE math). Month ladder and BvA variance are covered by `ForecastingAccountingCorrectnessTest` (exact numeric assertions, not structure-only).

| Case | Behavior |
|------|----------|
|------|----------|
| Overview / KPI load fail | Empty state + Retry |
| No expense categories | BvA empty state → Expense categories CTA |
| Justify without text | Button disabled; API validates min length |
| Approve without justification | Button disabled; API rejects |
| Scenario run fail | Toast via sanitizeErrorMessage |
| Offline | Forecasting is online-only (no IndexedDB queue); product recurring fields sync via existing product mutation queue |

## Source map

| Area | Path |
|------|------|
| Pages | `modules/forecasting/pages/` |
| API | `modules/forecasting/api/` |
| Module access | `shared/utils/moduleAccess.ts` (`forecasting` slug) |
| Paths | `app/routes/constants/shared.paths.ts` → `ROUTES.FORECASTING` |

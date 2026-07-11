# ADR: Financial Forecasting frontend module

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** Custospark Product Development Team

## Context

Backend forecasting APIs already expose cash forecast, budget vs actual, zero-based budgets, KPIs, and scenarios under `/api/v1/forecasting/*`. The frontend needed a full module registration, React Query layer, and pages aligned with HR/Accounting UX patterns.

## Decision

1. Register `forecasting` as a first-class `BusinessModuleSlug` with sidebar group near Accounting.
2. Mirror backend response shapes in `forecastingTypes.ts` and call endpoints via `axiosInstance` + React Query (same pattern as HR).
3. Use lightweight Forecasting surface components (HR-style panels) rather than inventing a new design system.
4. Surface assumptions/warnings on every analytical view; use healthy/tight/critical coverage chips.
5. Extend product catalog with `is_recurring` / `billing_interval` so SaaS KPI mode can resolve from catalog data.

## Consequences

- Owners/staff must grant the `forecasting` module in Module access settings.
- Forecasting pages are online-first; they do not enqueue offline mutations.
- Recurring product flags participate in the existing offline product sync path.

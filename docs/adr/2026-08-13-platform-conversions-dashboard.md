# Platform Conversions dashboard (trial → paid analytics)

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend + Backend (platform analytics subnav)

## Context

With the onboarding fee removed last-minute before the v5 launch (Backend ADR-037),
the product decision is to lower the barrier to entry and let users explore before
committing. Oscar wanted a dedicated **Platform → Conversions** view to measure the
trial → paid funnel end-to-end and prove (or disprove) that the lower-friction funnel
converts.

## Decision

New platform subnav **Conversions** (`/platform/conversions`) wired end-to-end:

### Backend (`GET /api/v1/platform/conversions`)

- New **`converted_at`** nullable timestamp on `subscriptions` (new migration
  `2026_08_13_000005_add_converted_at_to_subscriptions_table.php`), set once on the
  first transition to `ACTIVE` in `SubscriptionStateMachineService` (both activation
  paths), backfilled for existing active subscriptions from `COALESCE(approved_at,
  updated_at)`.
- `PlatformConversionMetricsService::conversionDashboard(?from, ?to)` returns:
  - **summary** — trials started / converted (today, this week, this month, in range),
    conversion rate, and current status distribution (active / on trial / past due /
    cancelled / suspended).
  - **monthly** — last 12 months of trials started, converted, and per-month rate.
  - **by_plan** — trials started vs converted grouped by plan slug over the range.
  - **decisions** — human-readable insight strings.
- New permission **`platform.conversions.view`** granted to `platform-admin` and
  `platform-analyst` (migration `2026_08_13_000004_add_conversions_platform_permission.php`).
- Conversion semantics: a subscription "converts" when it first reaches paid/`ACTIVE`
  status; "trials started" is subscription creation (all new registrations start on trial
  per ADR-035). Zero-division safe (rate 0.0 when no trials).

### Frontend

- `PlatformConversionsPage` with 6 stat cards (trials started, converted, rate, active
  now, on trial now, churned/suspended), a 30d/90d range toggle, a **Monthly Conversion
  Trend** composed chart (trials + converted bars with rate line), a **Yearly Conversion
  Distribution** line/area chart, a by-plan conversion breakdown with progress bars, and
  insight notes.
- `PlatformConversionCharts.tsx` keeps chart components under the 500-line file budget.
- Added `CONVERSIONS` route constant, endpoint constant, query hook
  (`usePlatformConversions`, fresh network mode), types, sidebar subnav item, and
  search keywords/descriptions.

## Consequences

- Platform admins/analysts get a live funnel view without touching tenant data.
- `converted_at` is a durable, accurate conversion event timestamp for future trends.
- Range-based queries always refetch (fresh network mode) so admin views never show
  stale snapshots.

## Related

- Backend ADR-036 (onboarding dismissal persists), ADR-037 (onboarding fee removed).
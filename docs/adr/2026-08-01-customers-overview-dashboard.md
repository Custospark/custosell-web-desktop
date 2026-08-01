# Customers analytics overview dashboard

**Date:** 2026-08-01

**Status:** Accepted

## Decision

Added a **Customers Overview** analytics page at `/customers/overview`, backed by a new backend endpoint `GET /customers/overview`. It replaces the prior list-only Customers module view with a summary dashboard plus the existing customer list.

## Why

Oscar requested customer analytics so owners can see segment mix, buying frequency, revenue trends, and top customers without digging through the raw list.

## What changed

### Backend (`Backend/`)
- `app/Services/CustomerService.php` + `app/Services/Contracts/CustomerServiceInterface.php` — new `getOverview()` aggregation.
- `app/Http/Controllers/Api/CustomerController.php` — new `overview()` action.
- `routes/api/v1/customers.php` — `GET /customers/overview` registered **before** `/{customer}` so the literal route wins over the parameterised one.

Overview payload: totals (customers, active, repeat rate), revenue, segment breakdown, frequency buckets, per-month new-customer and revenue trends, top-5 customers.

### Frontend (`Frontend/`)
- `src/renderer/shared/api/endpoints/endpoints.ts` — `CUSTOMERS.OVERVIEW`.
- `src/renderer/modules/customers/api/customers/CustomerTypes.ts` — `CustomerOverviewData`, `CustomerSegment`, `CustomerFrequencyBucket`, `CustomerMonthTrend`, `TopCustomer`.
- `src/renderer/modules/customers/api/customers/CustomerQueries.ts` — `useCustomerOverview` hook (always-fresh: `staleTime: 0`, refetch on mount + window focus).
- `src/renderer/modules/customers/CustomerOverviewPage.tsx` — stat cards, segment/frequency donuts, monthly trends bars, top-5 list.
- `src/renderer/app/routes/index.tsx` — route under `ModuleAccessMiddleware module="customers"`, registered before the index route.
- `src/renderer/modules/customers/ui/customers/CustomerList.tsx` — Overview button in header.

### Follow-up (same day)

- Customers module now has a **sidebar sub-nav** (`sidebarNavGroups.ts`): **Overview** → `/customers/overview`, **Customer List** → `/customers`, so both views are first-class app navigation. `baseSubRoutes` includes both.
- Stat cards removed from the **Customer List** page (they live on Overview only); the list keeps table + search + pagination. The Overview header button on the list remains as a quick link.

## Consequences

- Owners get a fast snapshot of their customer base.
- The overview is always-fresh to match the rest of the Customers module's near-real-time behaviour.
- Customers module keeps list + overview; navigation preserved for existing users (sidebar sub-nav + header quick link).

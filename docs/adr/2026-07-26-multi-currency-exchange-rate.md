# Multi-currency via client-side exchange rate conversion

**Date:** 2026-07-26

**Status:** Accepted

## Context

Custosell initially hardcoded UGX everywhere — prices, payment initiation, display formatting. Businesses outside Uganda (or wanting USD/KES/TZS) had no way to see prices in their own currency. PesaPal supports 4 currencies (UGX, KES, TZS, USD) but the system always defaulted to UGX.

## Decision

Adopt the same pattern Custocare uses:

1. **Backend stores prices in dual columns** — `price_monthly` (UGX) and `price_monthly_usd` (USD). All internal billing math runs in USD.
2. **Backend provides live exchange rates** via `GET /api/v1/currencies/convert?amount=&from=USD&to=KES` using exchangerate-api.com (6h cache).
3. **Frontend converts client-side** — reads the business's configured `currency` from Redux, fetches the USD→currency rate, multiplies for display.
4. **For UGX businesses** — stored `price_monthly` used directly (no conversion).
5. **For USD businesses** — stored `price_monthly_usd` used directly.
6. **For other currencies** — convert from `price_monthly_usd` via live rate.

## Consequences

- No more hardcoded `'UGX'` in format utilities, Intl.NumberFormat calls, or string concatenations.
- `formatCurrency(amount)` auto-resolves the business currency from Redux.
- New `useDisplayPrices()` hook provides `monthlyPrice(plan)` and `onboardingFee(plan)` in business currency.
- Exchange rate API failure gracefully falls back to USD raw price (no conversion).
- Business registration and settings already have `currency` column — no schema change needed for existing businesses.

## New backend components

- `app/Services/Currency/CurrencyExchangeService` — wraps exchangerate-api.com, 6h TTL cache
- `app/Services/Currency/Contracts/CurrencyExchangeServiceInterface`
- `app/Http/Controllers/Api/CurrencyController` — `GET /currencies/convert`
- `routes/api/v1/currency.php`
- `app/Providers/CurrencyServiceProvider`
- `database/migrations/2026_07_26_000003_add_usd_snapshot_to_subscriptions.php`

## New frontend components

- `src/renderer/shared/api/currency/CurrencyQueries.ts` — `useCurrencyConvert` hook
- `src/renderer/shared/utils/useDisplayPrices.ts` — `useDisplayPrices()` hook

## Subscription fixes included

- `activateAfterOnboarding()` accepts SUSPENDED status
- `handleUpgradeProration()` writes to `subscription_scheduled_changes` for audit trail
- PesaPal `country_code` is now dynamic from business country
- Multi-tab guard cache via `refetchOnWindowFocus: true`

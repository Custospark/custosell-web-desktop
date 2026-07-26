# Multi-Currency Pricing & Payment Routing

**Date:** 2026-07-26

**Status:** Accepted (expanded 2026-07-26)

## Context

Custosell initially hardcoded UGX everywhere — prices, payment initiation, display formatting. Businesses outside Uganda (or wanting USD/KES/TZS) had no way to see prices in their own currency. PesaPal supports 4 currencies (UGX, KES, TZS, USD) but the system always defaulted to UGX.

Two distinct problems needed solving:
1. **Display** — users should see plan prices in their business currency, with USD as the primary reference
2. **Payment** — PesaPal should be called with the correct currency (business local if supported, else USD)

## Decisions

### 1. Dual-column pricing (backend)

Backend stores prices in dual columns — `price_monthly` (UGX) and `price_monthly_usd` (USD). All internal billing math runs in USD. Subscriptions snapshot these prices at creation time via migration `2026_07_26_000003_add_usd_snapshot_to_subscriptions.php`.

### 2. Live exchange rates (backend → frontend)

Backend provides live exchange rates via `GET /api/v1/currencies/convert?amount=&from=USD&to=KES` using exchangerate-api.com with 6h cache. Frontend converts client-side for display.

### 3. USD-primary display (frontend)

Plan cards show **USD as the primary** price (e.g. `$20.00/mo`) with the business-currency equivalent underneath (e.g. `≈ UGX 75,000/mo`). This matches the Custocare pattern. Implemented in `PlanCards.tsx`, `PlanCard.tsx`, and `SubscriptionDropdown.tsx`.

### 4. Payment currency routing (frontend + backend)

**Frontend** — `getPaymentCurrency()` in `SubscriptionQueries.ts` selects:
- Business currency (UGX/KES/TZS) if PesaPal supports it → payment in local currency via mobile money
- `'USD'` otherwise → PesaPal in USD

**Backend** — `GatewayService::validatePaymentAmount()` checks the submitted amount against subscription USD snapshots with ±2% tolerance. For non-native currencies (KES, TZS), it converts from the USD snapshot × live rate and validates against that.

### 5. Subscription snapshot validation (backend)

Payment amounts are validated against the subscription's **snapshotted** prices (`price_monthly_usd`, `price_yearly_usd`), not the plan's current prices. This ensures locked-in rates apply even if plan prices change later. For UGX, validates against `price_monthly`. For USD, validates against `price_monthly_usd`. For KES/TZS, validates via live rate from the USD snapshot.

## Consequences

- **Display** — users always see USD as the primary price with local equivalent. No more hardcoded `'UGX'` in format utilities.
- **Payment** — Ugandan businesses pay in UGX via mobile money; other African businesses use their local currency if supported, else USD.
- **Validation** — backend catches mismatches: if the frontend sends $135 but the subscription snapshot says $54, it's rejected.
- **Exchange rate failure** — gracefully falls back to USD raw price for display; payment validation uses a ±2% tolerance so minor rate fluctuations don't block transactions.
- **No schema changes needed** — `businesses.currency` already exists (default: `UGX`).

## New/Changed components

### Backend

| Component | Change |
|-----------|--------|
| `app/Services/Currency/CurrencyExchangeService` | Wraps exchangerate-api.com, 6h TTL cache |
| `app/Services/Currency/Contracts/CurrencyExchangeServiceInterface` | Interface |
| `app/Http/Controllers/Api/CurrencyController` | `GET /currencies/convert` |
| `routes/api/v1/currency.php` | Route file |
| `app/Providers/CurrencyServiceProvider` | Service provider |
| `database/migrations/2026_07_26_000003_add_usd_snapshot_to_subscriptions.php` | Adds USD snapshot columns |
| `app/Services/Payment/GatewayService.php` | Multi-currency validation, exchange-rate conversion for KES/TZS |
| `app/Services/Billing/SubscriptionProrationCalculator.php` | Proration in USD (`proration_due_usd`) |
| `app/Http/Resources/UserResource.php` | Exposes USD fields |
| `app/Http/Resources/SubscriptionResource.php` | Exposes USD fields, `currency` |

### Frontend

| Component | Change |
|-----------|--------|
| `src/renderer/shared/api/currency/CurrencyQueries.ts` | `useCurrencyConvert` hook |
| `src/renderer/shared/utils/useDisplayPrices.ts` | USD helpers (`usdMonthlyPrice`, `usdYearlyPrice`, `usdOnboardingFee`, `yearlyPrice`) |
| `src/renderer/shared/utils/formatCurrency.ts` | `formatUSD()` helper |
| `src/renderer/shared/components/plans/PlanCards.tsx` | USD-primary display |
| `src/renderer/modules/settings/PlanCard.tsx` | USD-primary display, `monthlyPriceFn`/`yearlyPriceFn` props |
| `src/renderer/shared/components/layout/SubscriptionDropdown.tsx` | USD prices with local equivalent |
| `src/renderer/shared/api/account/SubscriptionQueries.ts` | `getPaymentCurrency()` utility, USD-default hooks |
| `src/renderer/modules/settings/PlansTab.tsx` | Payment amount in correct currency |
| `src/renderer/modules/settings/UpgradeFlowModal.tsx` | Uses `proration_due_usd` from backend |
| `src/renderer/modules/auth/OnboardingPage.tsx` | Sends fee in USD |

## Subscription fixes included

- `activateAfterOnboarding()` accepts SUSPENDED status
- `handleUpgradeProration()` writes to `subscription_scheduled_changes` for audit trail
- PesaPal `country_code` is now dynamic from business country
- Multi-tab guard cache via `refetchOnWindowFocus: true`

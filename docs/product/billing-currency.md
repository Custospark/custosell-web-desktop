# Billing Currency — Multi-Currency Pricing & Payment

How Custosell handles multi-currency pricing display and payment routing.

---

## Overview

```
Plan prices (USD + UGX)
       │
       ▼
Frontend display ──► USD primary with local equivalent (business.currency)
       │
       ▼
Payment initiation ──► getPaymentCurrency() selects UGX/KES/TZS or USD
       │
       ▼
Backend validation ──► GatewayService validates amount against subscription snapshot
       │
       ▼
PesaPal payment ──► Redirect to gateway with selected currency
```

---

## Display: USD Primary, Local Equivalent

### How it works

1. `useDisplayPrices()` reads the business's `currency` from Redux
2. For UGX businesses — raw UGX price used for local equivalent, USD price from plan/subscription snapshot
3. For USD businesses — USD price used directly
4. For other currencies (KES, TZS, etc.) — `useCurrencyConvert(1, 'USD', currency)` fetches the live rate with 6h cache, multiplies to get local equivalent

### Components

| Component | What it shows |
|-----------|---------------|
| `PlanCards.tsx` (shared) | `$20.00/mo` primary, `≈ UGX 75,000/mo` secondary; onboarding fee `$40.00` with approx; yearly save in USD |
| `PlanCard.tsx` (settings) | Same pattern. Uses `subscription.price_monthly_usd` for current plan (locked-in rate), `plan.price_monthly_usd` for other plans |
| `SubscriptionDropdown.tsx` | "Other plans" shows `$20/mo` with `≈ local/mo` below |

### Key logic

```typescript
// useDisplayPrices.ts
function usdMonthlyPrice(plan: Plan | Subscription): number {
  const usd = plan.price_monthly_usd ?? 0;
  return Number(usd);
}

function monthlyPrice(plan: Plan | Subscription): number {
  // Returns business-currency equivalent
  if (currency === 'UGX') return plan.price_monthly;
  if (currency === 'USD') return plan.price_monthly_usd;
  return (usdMonthlyPrice(plan) * rate); // converted via live rate
}
```

---

## Payment Currency Selection

### `getPaymentCurrency()` — the routing helper

Location: `src/renderer/shared/api/account/SubscriptionQueries.ts`

```
Business currency (businesses.currency)
         │
         ▼
Is it UGX, KES, or TZS? ──Yes──► Pay in business currency (local mobile money)
         │
         No
         ▼
         Pay in USD (fallback)
```

PesaPal supports exactly 4 currencies: **UGX**, **KES**, **TZS**, **USD**.

For businesses with UGX/KES/TZS → payment is submitted in the local currency. The backend validates using the subscription's USD snapshot × live exchange rate (for KES/TZS) or the stored UGX price (for UGX).

For all other currencies (or if the business has no currency set) → payment is submitted in USD.

### How payment hooks use it

```typescript
// Both default to currency: 'USD'
const payment = useInitiatePayment();
const onboardingPayment = useInitiateOnboardingPayment();

// The caller selects the correct currency:
const paymentCurrency = getPaymentCurrency(businessCurrency);
```

---

## Backend Validation

### `GatewayService::validatePaymentAmount()`

The validation pipeline:

1. Look up the subscription's snapshotted prices (`price_monthly_usd`, `price_monthly`, `price_yearly_usd`, `price_yearly`)
2. Determine which amount to validate against:
   - **UGX** → validate against `price_monthly` (or `price_yearly` if billing cycle matches)
   - **USD** → validate against `price_monthly_usd`
   - **KES / TZS** → convert `price_monthly_usd` to target currency via live exchange rate, validate against converted amount
3. Apply ±2% tolerance to account for minor rate fluctuations
4. Reject mismatches with a descriptive error message

```php
// Pseudo-logic
match ($paymentCurrency) {
    'UGX' => $expected = $subscription->price_monthly,
    'USD' => $expected = $subscription->price_monthly_usd,
    'KES', 'TZS' => $expected = $this->convert($subscription->price_monthly_usd, $paymentCurrency),
}
$tolerance = 0.02;
if (abs($submitted - $expected) / $expected > $tolerance) {
    throw new PaymentValidationException("...");
}
```

### Subscription snapshot vs plan price

Subscriptions snapshot prices at creation/upgrade time:
- `subscriptions.price_monthly_usd` — locked-in USD price
- `subscriptions.price_monthly` — locked-in UGX price

This means a user who subscribed to Enterprise when it was $54/mo still pays $54 even if the plan price later rises to $135. The payment validation always checks the **subscription snapshot**, not the **plan's current price**.

---

## Full Payment Flow

### Example: Oscar pays subscription renewal in UGX

```
1. Display: PlanCards shows "$54.00/mo ≈ UGX 200,000/mo"
2. User clicks "Pay" → PlansTab.tsx computes amount
3. getPaymentCurrency('UGX') → returns 'UGX'
4. useInitiatePayment({ amount: 200000, currency: 'UGX', ... })
5. POST /billing/payments/initiate
6. GatewayService validates: subscription snapshot = 200,000 UGX ✅
7. PesaPal redirect URL returned → user redirected to PesaPal
8. User pays via mobile money (UGX)
```

### Example: David pays subscription renewal in USD

```
1. Display: PlanCards shows "$135.00/mo" (business currency = USD)
2. User clicks "Pay" → PlansTab.tsx computes amount
3. getPaymentCurrency('USD') → returns 'USD'
4. useInitiatePayment({ amount: 135, currency: 'USD', ... })
5. POST /billing/payments/initiate
6. GatewayService validates: subscription snapshot = $135 USD ✅
7. PesaPal redirect URL returned → user pays via card/USD method
```

### Example: Kenyan business pays in KES

```
1. Display shows "$54.00/mo ≈ KES 7,020/mo"
2. User clicks "Pay" → PlansTab.tsx computes amount in KES
3. getPaymentCurrency('KES') → returns 'KES'
4. useInitiatePayment({ amount: 7020, currency: 'KES', ... })
5. POST /billing/payments/initiate
6. GatewayService validates: converts $54 → KES 7,020 via live rate ✅
7. PesaPal redirect URL returned → user pays via M-Pesa (KES)
```

---

## Edge Cases & Failure States

| Scenario | What happens |
|----------|-------------|
| Exchange rate API fails (display) | `useDisplayPrices` returns raw USD price, no conversion. User sees `$20.00/mo` with no local equivalent |
| Exchange rate API fails (payment validation) | GatewayService falls back to direct currency comparison. If currency is KES/TZS and rate unavailable, validation is stricter |
| Business has no currency set | Defaults to `UGX` in database. `getPaymentCurrency('UGX')` returns `'UGX'` |
| Business currency is unsupported (e.g. RWF) | `getPaymentCurrency('RWF')` returns `'USD'`. Display shows USD with ≈ RWF equivalent if rate available |
| Amount mismatch (frontend bug) | Backend rejects with clear message: `Payment amount X does not match expected amount Y for subscription` |
| Subscription snapshot stale | Snapshot captures price at subscription time. If plan prices change later, existing users keep their locked-in rate in the checkout |
| PesaPal rejects currency | Currency routing ensures only PesaPal-supported currencies (UGX, KES, TZS, USD) are ever submitted |
| Onboarding payment in non-UGX | `OnboardingPage` always sends `currency: 'USD'` + `feeUsd` since onboarding fee is billed in USD regardless of business currency |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/renderer/shared/utils/useDisplayPrices.ts` | Display-price hooks (USD + local equivalent) |
| `src/renderer/shared/utils/formatCurrency.ts` | `formatUSD()` helper |
| `src/renderer/shared/components/plans/PlanCards.tsx` | Shared plan card with USD-primary display |
| `src/renderer/modules/settings/PlanCard.tsx` | Settings plan card, `monthlyPriceFn`/`yearlyPriceFn` props |
| `src/renderer/shared/components/layout/SubscriptionDropdown.tsx` | Subscription dropdown with USD prices |
| `src/renderer/shared/api/account/SubscriptionQueries.ts` | `getPaymentCurrency()` helper, payment hooks |
| `src/renderer/modules/settings/PlansTab.tsx` | Payment amount in correct currency |
| `src/renderer/modules/settings/UpgradeFlowModal.tsx` | Uses `proration_due_usd` |
| `src/renderer/modules/auth/OnboardingPage.tsx` | Onboarding fee in USD |
| `Backend/app/Services/Payment/GatewayService.php` | Multi-currency validation |
| `Backend/app/Services/Billing/SubscriptionProrationCalculator.php` | Proration in USD |
| `Backend/app/Http/Resources/UserResource.php` | USD fields |
| `Backend/app/Http/Resources/SubscriptionResource.php` | USD fields, currency |

## Related ADRs

- [2026-07-26-multi-currency-exchange-rate.md](../adr/2026-07-26-multi-currency-exchange-rate.md) — Original design decision (expanded)
- [2026-07-26-upgrade-flow-proration.md](../adr/2026-07-26-upgrade-flow-proration.md) — Proration in USD

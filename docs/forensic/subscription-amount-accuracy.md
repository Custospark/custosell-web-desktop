# Subscription & Payment Amount Accuracy — Master Scenario Document

**Date:** 2026-07-31
**Owner:** Mike (Orchestrator) · **Reviewer:** Oscar
**Status:** Living document — every scenario below is backed by a real-number automated test in
`Backend/tests/Feature/Api/Billing/ProrationAccuracyTest.php`.

## Goal

Every amount a user sees on **Settings → Plans** must be exactly the amount that will be
**charged** (or **credited**). UI display, the amount sent to the payment provider, backend
authoritative math, credits, proration, discounts, downgrades and rewards must all reconcile.

## Sources of Truth

| Truth | Value | Source |
|-------|-------|--------|
| Plan prices (USD) | Essential **$20/mo · $200/yr** — Professional **$54/mo · $540/yr** — Enterprise **$135/mo · $1350/yr** | `Backend/database/seeders/PlanSeeder.php` |
| Subscription price snapshot | `subscriptions.price_monthly_usd` / `price_yearly_usd` | Locked at subscribe/upgrade time |
| Exchange rate (USD→local) | Resolved at display (`useDisplayPrices`) and at initiation (`CurrencyExchangeService`) | Both must reconcile within tolerance |
| PesaPal supported currencies | **UGX, KES, TZS, USD** | `getPaymentCurrency()` |
| USD→UGX display conversion | `Math.round(base * rate * 100) / 100` | `Frontend/src/renderer/shared/utils/useDisplayPrices.ts` |
| Backend amount tolerance | USD: **$0.50** · local: **max(50, 2%)** | `Backend/app/Services/Payment/Validation/PaymentValidator.php` |
| Backend amount authority | `GatewayService::initiatePayment()` + `PaymentValidator` | Overrides/validates every amount |

**Worked reference numbers** (rate `1 USD = 3708.59 UGX`, observed in `useDisplayPrices`):
- $54 → **USh 200,263.86** · $135 → **USh 500,659.65** · $40.50 → **USh 150,197.90**

---

## Payment Type Matrix (per Payment Architecture ADR)

| Type | Trigger action(s) | Amount authority | Validated against | Side effects on confirmation |
|------|-------------------|------------------|-------------------|------------------------------|
| `onboarding` | Pay Setup Fee | `plan.onboarding_fee_usd` (server override) | Exact (tol $0.50) | `activateAfterOnboarding()` + referral reward |
| `subscription` | Subscribe / Subscribe Now / Re-subscribe / Reactivate | `plan.price_monthly_usd`/`price_yearly_usd` (server override) | Exact (tol $0.50) | `activateSubscription()` + referral reward |
| `renewal` | Pay Outstanding | plan price matching billing cycle (server override) | Exact (tol $0.50) | `renewSubscription()` |
| `upgrade_proration` | Upgrade | frontend (from quote), validated | `metadata.pending_upgrade_amount_usd` (tol $0.50) | `handleUpgradeProration()` + referral reward + account promotion |
| `billing_cycle_change` | Apply Yearly/Monthly Billing (immediate) | frontend (from quote), validated | `metadata.pending_cycle_change_amount_usd` (tol $0.50) | `handleBillingCycleChange()` |

---

## All User Actions — Amounts Shown vs. Amounts Sent

Legend: **UI** = amount displayed · **API** = amount sent to backend · **Provider** = amount actually sent to PesaPal (after backend discounts/credits) · **Backend** = authoritative math.

### A. Subscribe / Re-subscribe / Subscribe Now (`subscription`)

Triggered when status is `none`, `expired`, `cancelled` (Subscribe / Re-subscribe), or
`trial` + `onboarding_fee_paid` (Subscribe Now, i.e. end trial early and pay).

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | `monthlyPrice(plan)` or `yearlyPrice(plan)` | business currency (local) |
| **API** | same computed amount | business currency |
| **Provider** | backend recomputes = plan price snapshot (monthly or yearly) → converted to local | local |
| **Backend** | `plan.price_monthly_usd`/`price_yearly_usd` × rate (tolerance ±$0.50 USD / ±2% local) | authoritative |

Notes:
- Credit = none (no proration on first payment).
- Referral reward: `activateForSubscription()` on confirmation.
- **Failure states:** amount mismatch → `Payment amount X does not match expected amount Y for subscription`; stale snapshot honored (user keeps locked-in price).

### B. Pay Setup Fee (`onboarding`)

Triggered when status is `trial` and `onboarding_fee_paid = false` (trial_unpaid → Pay Setup Fee).

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | `onboardingFee(plan)` | business currency (local) |
| **API** | same computed amount | business currency |
| **Provider** | backend recomputes = `plan.onboarding_fee_usd` × rate | local |
| **Backend** | `plan.onboarding_fee_usd` (server override) | authoritative |

Notes:
- Trial keeps running if `trial_ends_at` is still in the future — payment only clears the onboarding flag.
- Referral reward: yes, via `activateForSubscription()`.

### C. Pay Outstanding (`renewal`)

Triggered when status is `past_due` (current plan → Pay Outstanding).

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | `monthlyPrice(plan)`/`yearlyPrice(plan)`, then backend credit applied | local |
| **API** | full plan price (local) | local |
| **Provider** | full plan price − referral discount − billing credits (FIFO), converted | local |
| **Backend** | plan price snapshot matching billing cycle; credits via `CreditService::applyToRenewal()` | authoritative |

Notes:
- **Credits** are applied on the backend only (UI displays them but must not subtract them from the API amount — that is correct today, but the *display arithmetic* mixes currencies, see BUG D).
- Referral: discount applied at initiation if referral still PENDING; reward NOT re-created (already active).

### D. Upgrade (`upgrade_proration`)

Triggered when the user picks a **higher** plan (`higher` relation, any paying status).

Flow: `GET proration-quote` → `POST upgrade(immediate)` → if due > 0 `POST initiate` → webhook.

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | Proration breakdown: credit, charge, due today (`price(proration_due)` → local) | local |
| **API** | `proration_due` from quote — **always the USD value**, even for non-USD businesses | USD (backend contract) |
| **Provider** | due − referral discount − credits, converted to local by backend at initiation rate | local |
| **Backend** | `calculateUpgradeCost()` = charge(remaining days of new plan) − credit(unused days of current plan); stored as `pending_upgrade_amount_usd`; validate amount as USD, then convert | USD → local |

> **Contract (important):** For `upgrade_proration` and `billing_cycle_change`, the backend
> interprets the incoming `amount` as **USD** (`GatewayService` line 78 forces `currency='USD'`
> before `PaymentValidator`), validates it against the stored USD pending amount, then converts
> to the business payment currency for the gateway. The frontend therefore sends the **USD**
> proration figure — sending the local-converted figure would be rejected. The `currency` field
> sent by the frontend is informational only for these types.

**Proration math (USD):**
```
daysInPeriod  = next_billing_date − (next_billing_date − 1 billing period)
daysRemaining = today → next_billing_date        (0 if period already over)
credit        = round(old_price × daysRemaining / daysInPeriod, 2)
charge        = round(new_price × daysRemaining / daysInPeriod, 2)
proration_due = round(max(0, charge − credit), 2)
```

Notes:
- **Plan change is deferred** until payment confirmation (metadata `pending_upgrade_*`). Zero-due upgrades skip the gateway via `processZeroCostUpgrade()`.
- Referral reward: yes (upgrade is a conversion event).
- **Failure states:** payment fails → plan stays on current plan (metadata pending only); duplicate webhook → idempotent; amount tamper → rejected against `pending_upgrade_amount_usd`.

### E. Billing Cycle Change (`billing_cycle_change`)

Triggered by "Apply Yearly/Monthly Billing". Monthly→Yearly is immediate + payment; Yearly→Monthly is end-of-period, no payment.

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | `proration_due_usd` (currently shown in USD always) | USD (BUG C) |
| **API** | `proration_due_usd` — **USD value**, same contract as upgrade | USD (backend contract) |
| **Provider** | validated against `pending_cycle_change_amount_usd`, converted to local | local |
| **Backend** | `calculateUpgradeCost()` with same plan; new price = target cycle price | USD, validated |

### F. Reactivate (`subscription`)

Triggered when status is `suspended` (Reactivate on any plan card).

| Amount | Value | Currency |
|--------|-------|----------|
| **UI** | `monthlyPrice(plan)`/`yearlyPrice(plan)` | local |
| **API** | same | local |
| **Provider** | backend = plan price snapshot | local |
| **Backend** | plan price (server override); `reactivate()` → active | authoritative |

### G. Downgrade (no payment)

Triggered by `lower` relation → Schedule Downgrade. **No payment required.**
- `effective=end_of_period` (default): `schedulePlanChange()`; applied by cron at `next_billing_date`.
- `effective=immediate`: plan changed immediately via `subscriptionService->update()`, single update, no side effects.
- Proration **credit is NOT paid out** on downgrade — the user simply drops to the lower price next period.

### H. Cancel (no payment)

- Period-end (`cancel(false)`): `cancel_at_period_end=true`, status stays active until cron.
- Immediate (admin): status → cancelled, `ends_at` = now.

### I. Referral / Promo Code & Rewards

| Stage | Effect |
|-------|--------|
| `processReferral()` (code entered) | Referral PENDING, `discount_applied=X`; one referral per business lifetime |
| Initiation | PENDING → APPLIED; amount reduced by `min(discount, amount)` |
| Confirmation | `activateForSubscription()` → `markActive()` creates BillingCredit (remaining discount months) + referrer reward |

Notes:
- `discount_applied` is **informational only** — `price_monthly`/`price_yearly` are NEVER reduced; reward/commission always on full price.
- **Quote endpoint does NOT include the referral discount** (future improvement #1 in the ADR) — the frontend subtracts `referral.discount_applied` manually.

---

## Real-Number Worked Examples

### D1. Professional → Enterprise (monthly), 15 days remaining / 30-day period

```
credit = round(54.00 × 15/30, 2)  = 27.00
charge = round(135.00 × 15/30, 2) = 67.50
due    = round(max(0, 67.50 − 27.00), 2) = 40.50
```
- **UI (UGX):** USh 150,197.90 (40.50 × 3708.59)
- **API:** sends `40.50` (USD) + `currency: 'UGX'` — backend validates as USD vs `pending_upgrade_amount_usd = 40.50`, then charges **USh 150,197.90** (40.50 × 3708.59)
- **Backend stored:** `pending_upgrade_amount_usd = 40.50`

### D2. Professional → Enterprise (monthly), 20 days remaining / 30-day period

```
credit = round(54.00 × 20/30, 2)  = 36.00
charge = round(135.00 × 20/30, 2) = 90.00
due    = round(max(0, 90.00 − 36.00), 2) = 54.00
```

### D3. Professional → Enterprise with yearly override, 20 days remaining / 365-day period

```
old  = 540.00   new = 1350.00
credit = round(540 × 20/365, 2)  = 29.59
charge = round(1350 × 20/365, 2) = 73.97
due    = round(max(0, 73.97 − 29.59), 2) = 44.38
```

### D4. Equal-priced upgrade (credit ≥ charge) → $0 due → `processZeroCostUpgrade()`, no gateway.

---

## Known Accuracy Issues (confirmed in code)

| ID | Severity | Issue | Where |
|----|----------|-------|-------|
| BUG A | 🔴 Fixed | Trial upgrades forced proration to $0 (`Amount due today USh 0.00`) | `PaymentQuoteService::getQuote()` — trial-zeroing block removed |
| BUG C | 🟡 | Upgrade **paying step** for non-USD businesses formats the **USD** proration figure as if it were local currency (e.g. `USh 40.50` instead of `USh 150,197.90`); Pay button & polling text show USD only. Billing Cycle modal shows USD only. | `UpgradeFlowModal` (paying/polling step), `BillingCyclePaymentModal` |
| BUG D | 🟡 | Renewal credit display mixes USD credit with local amount (`creditApplied = min(USD, local)`) and shows total in USD when credit applied | `SubscriptionPaymentModal` |

> Note: The **amount sent to the provider** for upgrades/cycle-changes is correct today (USD
> contract + backend conversion). The remaining work is **display-only** accuracy for
> non-USD businesses, plus a documentation note that the USD-send contract is intentional.

---

## Automated Test Matrix

Every scenario below is asserted with real numbers in
`Backend/tests/Feature/Api/Billing/ProrationAccuracyTest.php` (fixed rate **3708.59 UGX/USD**):

| Test | Verifies |
|------|----------|
| `test_proration_quote_endpoint_returns_exact_figures_for_trial_upgrade` | quote endpoint returns exact credit/charge/due/days for a trial Professional→Enterprise |
| `test_upgrade_endpoint_stores_authoritative_pending_amount_in_metadata` | `POST upgrade` stores exact `pending_upgrade_amount_usd`, doesn't change plan |
| `test_subscription_payment_amount_is_authoritative_plan_price_during_trial` | backend ignores frontend amount (sends $1, backend charges $54 → **UGX 200,263.86**) |
| `test_upgrade_payment_charges_exact_local_amount_after_conversion` | after upgrade, initiate payment → payment created at exact UGX figure (due × 3708.59), USD contract |
| `test_upgrade_payment_rejects_tampered_amount` | amount ≠ `pending_upgrade_amount_usd` → 502, no payment created |
| `test_onboarding_payment_amount_is_authoritative` | frontend amount ignored; charges exact `onboarding_fee_usd` (Professional = $95 → UGX 352,316.05) |
| `test_billing_cycle_change_monthly_to_yearly_stores_pending_and_quotes` | immediate switch stores `pending_cycle_change_amount_usd`, exact quote |
| `test_zero_cost_upgrade_creates_zero_payment_and_changes_plan` | equal/lower proration due → $0 completed payment, plan changes atomically |
| `test_downgrade_immediate_and_end_of_period_require_no_payment` | downgrade never creates a payment; schedules change correctly |

---

## Related Documents

- `Backend/docs/adr/2026-07-30-payment-architecture.md` — payment type lifecycle & atomicity
- `Backend/docs/billing-scenarios.md` — real-life user scenarios (older, narrative)
- `Frontend/docs/forensic/subscription-payment-audit.md` — prior C/H/M/L audit
- `Frontend/docs/product/billing-currency.md` — multi-currency display & payment routing
- `Frontend/docs/adr/2026-07-26-upgrade-flow-proration.md` — upgrade flow redesign
- `Backend/docs/adr/2026-07-26-referral-credit-system.md` — credit & rewards

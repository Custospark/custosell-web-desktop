# Forensic Audit: Subscription, Payment, Plan, Onboarding & Referral

**Date:** 2026-07-26
**Scope:** Frontend + Backend
**Auditor:** Mike (Orchestrator)

---

## Severity Legend

| Severity | Label | Meaning |
|----------|-------|---------|
| 🔴 Critical | C# | Production-blocking. Causes data loss, double charges, or broken onboarding. Fix immediately. |
| 🟠 High | H# | Will cause incorrect billing, race conditions, or state corruption in edge cases. Fix next. |
| 🟡 Medium | M# | Functional correctness, missing features, or error-handling gaps. Fix before launch. |
| ⚪ Low | L# | Polish, security hardening, or documentation. Nice-to-have but not blocking. |

---

## State Machine Reference

```
REGISTER → subscribe() → TRIAL (if trial_days>0) or PAST_DUE (if no trial)
                              │                              │
                    onboarding_fee_paid=false         onboarding_fee_paid=false
                              │                              │
                        pay onboarding                 pay onboarding
                              │                              │
                    activateAfterOnboarding()       activateAfterOnboarding()
                              │                              │
                    ┌──── TRIAL ────┐              ┌── ACTIVE ──┐
                    │ (if trial     │              │            │
                    │  days>0 &&    │          cancel()   next_billing_date
                    │  !trial_used) │              │            │
                    │              │           CANCELLED    markPastDue()
                    │              │                           │
              trial ends       ACTIVE                      PAST_DUE
                    │              │                           │       │
               (currently       renew()                  pay within   grace expires
                EXPIRED)          │                       grace?         │
                              next_billing_date →          │         SUSPENDED
                                  PAST_DUE              ACTIVE          │     │
                                                                     pay?   cancel()
                                                                      │    CANCELLED
                                                                    ACTIVE
```

---

## 🔴 CRITICAL GAPS

### C1 - `activateAfterOnboarding` rejects TRIAL status

**User story:** As a business owner who registers for a plan with trial days, I expect to pay the onboarding fee and have my trial period begin. Instead, the payment succeeds but the subscription never activates because the backend rejects the TRIAL status.

**Root cause:** `SubscriptionService::activateAfterOnboarding()` (line 245) checks `$subscription->status !== SubscriptionStatus::PAST_DUE` and throws if TRIAL. But `subscribe()` creates subscriptions as TRIAL when `plan.trial_days > 0`. The onboarding payment webhook calls `activateAfterOnboarding()` → throws → subscription stays in TRIAL with `onboarding_fee_paid` still false.

**Affected flow:** Every trial-plan user who pays the onboarding fee.

**Fix:** Accept both PAST_DUE and TRIAL. For TRIAL subscriptions with a future `trial_ends_at`, just mark `onboarding_fee_paid = true` and leave the trial running.

**Files:**
- `Backend/app/Services/SubscriptionService.php` (lines 128-154, 243-279)

**Tests to add:**
- `activateAfterOnboarding` with TRIAL status and future `trial_ends_at` keeps TRIAL
- `activateAfterOnboarding` with TRIAL status and past `trial_ends_at` transitions to ACTIVE
- `activateAfterOnboarding` with PAST_DUE status continues working

---

### C2 - `trial_used` set too early; users lose trial period

**User story:** As a business owner who registers for a 14-day trial plan and pays the onboarding fee on day 5, I expect to have 9 days of trial remaining. Instead, after payment, my subscription goes directly to ACTIVE and I'm billed immediately. I lose my remaining trial days.

**Root cause:** `subscribe()` sets `trial_used = true` immediately when creating the trial subscription (line 115). Later, `activateAfterOnboarding()` checks `!$subscription->trial_used` to decide whether to start a trial period. Since it's already `true`, the trial branch is skipped and the subscription goes straight to ACTIVE.

**Affected flow:** Every trial-plan subscriber who doesn't pay the onboarding fee before subscribing.

**Fix:** Don't set `trial_used` in `subscribe()`. Set it only when the trial is actually entered (in `activateAfterOnboarding` when transitioning to TRIAL, or when the trial expires). In `activateAfterOnboarding`, check `trial_ends_at` directly: if it's already set and in the future, keep the trial running and just mark onboarding paid.

**Files:**
- `Backend/app/Services/SubscriptionService.php` (line 115, lines 243-279)

**Tests to add:**
- `subscribe` with trial plan does NOT set `trial_used`
- `activateAfterOnboarding` with a subscription that has future `trial_ends_at` keeps it in TRIAL
- `activateAfterOnboarding` with a subscription without trial sets to ACTIVE
- `trial_used` is correctly set when trial is entered or expires

---

### C3 - Bypass dev mode calls `activateAfterOnboarding` for ALL payment types

**User story:** As a developer testing in bypass mode, I expect payment processing to correctly distinguish between onboarding fees, renewals, and subscriptions. Instead, ALL bypassed payments call `activateAfterOnboarding`, which fails or incorrectly activates subscriptions regardless of the actual payment type.

**Root cause:** `GatewayService::initiatePayment()` (line 85) in the bypass branch unconditionally calls `activateAfterOnboarding($payment->subscription)` without checking `$payment->payment_type`.

**Fix:** Check `$payment->payment_type` in the bypass flow and call the appropriate handler, just like `autoApprove` does.

**Files:**
- `Backend/app/Services/Payment/GatewayService.php` (lines 74-98)

**Tests to add:**
- Bypass onboarding payment calls `activateAfterOnboarding`
- Bypass subscription payment calls `activateSubscription`
- Bypass renewal payment calls `renewSubscription`
- Bypass upgrade_proration payment completes correctly

---

## 🟠 HIGH GAPS

### H1 - `autoApprove` doesn't handle `upgrade_proration` payment type

**User story:** As a business owner who upgrades my plan and pays the proration amount, I expect the upgrade to be confirmed when the gateway sends the webhook. Instead, the payment is recorded as completed but no subscription plan change occurs because the webhook handler doesn't know what to do with `upgrade_proration`.

**Root cause:** `GatewayService::autoApprove()` (line 246) has a `match` statement that handles `onboarding`, `subscription`, and `renewal` - but falls to `default => null` for `upgrade_proration`. Currently mitigated by the frontend calling the upgrade mutation after payment, but this creates a race condition if the frontend crashes between payment confirmation and mutation.

**Fix:** Store `{ action: 'upgrade', to_plan_id }` in payment metadata during initiation. Handle `upgrade_proration` in `autoApprove` by reading the metadata and performing the plan change.

**Files:**
- `Backend/app/Services/Payment/GatewayService.php` (lines 226-266)
- `Backend/app/Http/Controllers/Api/Billing/PaymentController.php` (lines 62-96)

**Tests to add:**
- `autoApprove` with `upgrade_proration` type reads metadata and upgrades plan
- `autoApprove` with missing `to_plan_id` metadata does not crash
- Webhook flow for upgrade proration works end-to-end

---

### H2 - Trial transitions to EXPIRED (terminal) instead of PAST_DUE

**User story:** As a business owner whose trial period ends without paying, I expect to enter a grace period where I can still pay and activate. Instead, my subscription goes to EXPIRED - a terminal state - forcing me to create an entirely new subscription and losing all my data context.

**Root cause:** `processDueTransitions()` (line 339) sets TRIAL to EXPIRED when `trial_ends_at` passes. EXPIRED is treated as terminal. There's no transition path from EXPIRED to any other state.

**Fix:** Transition TRIAL to PAST_DUE (with grace period) instead of EXPIRED. Only transition to EXPIRED if the grace period also expires without payment.

**Files:**
- `Backend/app/Services/SubscriptionService.php` (lines 335-370)

**Tests to add:**
- Trial expired transitions to PAST_DUE (active subscription with access during grace)
- `hasAccess()` returns true during PAST_DUE grace period
- PAST_DUE grace expired transitions to SUSPENDED (existing test already covers this)
- No subscription ever goes to EXPIRED from TRIAL via `processDueTransitions`
- Console command `SubscriptionsExpireTrials` updated

---

### H3 - `grace_used` guard silently swallowed; subscription never transitions

**User story:** As a business owner whose subscription goes past due and is reactivated after payment, I expect that if I miss the NEXT payment, I'll go past due again. Instead, my subscription stays ACTIVE forever because the grace period was already used once and the exception is silently caught.

**Root cause:** `processDueTransitions()` (line 356) calls `markPastDue()` inside a try-catch. `markPastDue()` throws `RuntimeException` if `grace_used` is already true. The catch block is empty, so the subscription stays ACTIVE and never transitions.

**Fix:** In `processDueTransitions`, if `next_billing_date` is past and the subscription can't go PAST_DUE (grace used), go directly to SUSPENDED.

**Files:**
- `Backend/app/Services/SubscriptionService.php` (lines 335-370)

**Tests to add:**
- ACTIVE subscription with `grace_used = true` and past `next_billing_date` goes to SUSPENDED
- ACTIVE subscription with `grace_used = false` and past `next_billing_date` goes to PAST_DUE (existing)
- `processRenewals` handles grace_used subscriptions correctly

---

### H4 - Payment-first flow race condition on frontend crash

**User story:** As a business owner who clicks "Upgrade", pays through the gateway, and closes the browser tab before the confirmation page loads, I expect my plan to be upgraded. Instead, the payment is collected but my subscription plan never changes because the upgrade mutation was never called.

**Root cause:** The frontend payment-first flow fires the backend mutation (subscribe/upgrade/reactivate) AFTER payment completes. If the browser tab is closed, the network fails, or the app crashes between payment confirmation and the mutation call, the payment is recorded but no subscription change occurs.

**Fix:** Store the action intent in payment metadata during initiation (`{ action: 'subscribe', plan_id }` or `{ action: 'upgrade', to_plan_id }`). Handle ALL payment types in `autoApprove` on the backend. The frontend mutation becomes a safety net rather than the primary trigger.

**Files:**
- `Backend/app/Services/Payment/GatewayService.php`
- `Backend/app/Http/Controllers/Api/Billing/PaymentController.php`
- `Frontend/src/renderer/modules/settings/PlansTab.tsx`
- `Frontend/src/renderer/modules/settings/SubscriptionPaymentModal.tsx`

**Tests to add:**
- Payment metadata propagates to `autoApprove`
- `autoApprove` handles subscription intent correctly
- Frontend `handlePaymentComplete` still calls mutation as safety net

---

### H5 - No idempotency on payment initiation (double-charge risk)

**User story:** As a business owner who double-clicks "Pay Now" due to a slow network, I expect only one payment to be processed. Instead, two payments are initiated and I could be charged twice.

**Root cause:** `GatewayService::initiatePayment()` creates a new `BillingPayment` record every time it's called, with no check for duplicate requests.

**Fix:** Generate an idempotency key on the frontend, send it in the request, and check for duplicate payments on the backend.

**Files:**
- `Backend/app/Services/Payment/GatewayService.php`
- `Backend/app/Http/Controllers/Api/Billing/PaymentController.php`
- `Backend/database/migrations/` (add `idempotency_key` column)
- `Frontend/src/renderer/modules/settings/SubscriptionPaymentModal.tsx`
- `Frontend/src/renderer/modules/auth/OnboardingPage.tsx`

**Tests to add:**
- Same idempotency key returns existing payment (no duplicate)
- Different idempotency keys create separate payments
- Missing idempotency key still works (backward compat)

---

## 🟡 MEDIUM GAPS

### M1 - SubscriptionGuard has no offline fallback

**User story:** As a business owner using Custosell offline, I expect to access my business routes when I have a valid subscription. Instead, the SubscriptionGuard shows a permanent loading spinner because the access-check API call fails offline.

**Root cause:** `SubscriptionGuard` fetches `SUBSCRIPTIONS.ACCESS` via API with `retry: false`. When offline, the query fails and `hasAccess` stays `undefined`. The component checks `isLoading` first, which stays true due to query mechanics.

**Fix:** Add offline fallback that computes `hasAccess` from the Redux subscription state using the same logic as the backend's `hasAccess()` method (check status + dates).

**Files:**
- `Frontend/src/renderer/app/routes/middleware/SubscriptionGuard.tsx`

**Tests to add:**
- (Manual) App loads offline, SubscriptionGuard reads from Redux
- Redux subscription status shows active → guard passes
- Redux subscription status shows suspended → guard shows blocked overlay

---

### M2 - `getByBusiness` double-fetches on every route request

**User story:** As a developer, I expect the subscription lookup for a business to be efficient. Instead, every request that checks subscription access performs TWO database queries - one for the transition check and one for the fresh fetch.

**Root cause:** `getByBusiness()` calls `processDueTransitions()` which may update the subscription, then calls `findByBusiness()` again to get a fresh copy. The repository `update()` typically returns the fresh model, so the second fetch is redundant.

**Fix:** Return the result of the transition update directly.

**Files:**
- `Backend/app/Services/SubscriptionService.php` (lines 35-43)

**Tests to add:**
- (Performance) `getByBusiness` makes only one DB query when no transition occurs

---

### M3 - No subscription lifecycle notifications

**User story:** As a business owner, I expect to receive email or SMS notifications when my trial is ending soon, when my payment is due, or when my subscription is suspended. Instead, there are no notifications - I only find out when I'm locked out.

**Root cause:** No notification classes exist for subscription events.

**Fix:** Create notification classes for: trial ending (3 days before), payment overdue, subscription suspended, subscription activated/reactivated.

**Files:**
- `Backend/app/Notifications/` (new files)
- `Backend/app/Services/SubscriptionService.php` (fire notifications)
- `Backend/app/Console/Commands/` (scheduled check)

---

### M4 - Upgrade payment metadata missing `to_plan_id`

**User story:** As a business owner upgrading my plan and paying the proration amount, I expect the upgrade to be fully traceable end-to-end. Instead, the payment record doesn't store which plan I was upgrading to, making it impossible to reconcile upgrades from the payment record alone.

**Root cause:** The frontend initiates upgrade payments without passing `{ action: 'upgrade', to_plan_id }` in the metadata. The payment record stores no information about the target plan.

**Fix:** Pass `{ action: 'upgrade', to_plan_id: plan.id }` in payment metadata when initiating upgrade payments.

**Files:**
- `Frontend/src/renderer/modules/settings/PlansTab.tsx`
- `Frontend/src/renderer/modules/settings/SubscriptionPaymentModal.tsx`
- `Backend/app/Http/Controllers/Api/Billing/PaymentController.php`

---

### M5 - No cancel subscription frontend UI

**User story:** As a business owner, I expect to cancel my subscription from the settings page. Instead, there is no cancel button - I would need to call the API directly.

**Root cause:** The subscription settings page has no cancellation UI. The backend endpoint (`POST /subscriptions/{id}/cancel`) exists but is not exposed on the frontend.

**Fix:** Add a "Cancel Subscription" section with confirmation modal (immediate vs end-of-period options).

**Files:**
- `Frontend/src/renderer/modules/settings/PlansTab.tsx`
- `Frontend/src/renderer/modules/settings/SubscriptionSettingsPage.tsx`
- `Frontend/src/renderer/shared/api/account/SubscriptionQueries.ts`

---

### M6 - Stale pending payments have no timeout

**User story:** As a business owner who initiates a payment but never completes it, I expect the pending payment to eventually expire. Instead, it stays PENDING forever with no cleanup.

**Root cause:** No console command or scheduled job exists to expire stale pending payments.

**Fix:** Create a console command `SubscriptionsExpirePendingPayments` that marks payments older than N hours as failed. Add it to the schedule.

**Files:**
- `Backend/app/Console/Commands/` (new file)
- `Backend/app/Console/Kernel.php` (schedule)

---

### M7 - `PaymentService::complete()` doesn't trigger subscription changes

**User story:** As a developer calling `PaymentService::complete()` to mark a payment as done, I expect the subscription to be updated if needed. Instead, the subscription state remains unchanged unless `GatewayService::autoApprove()` is used.

**Root cause:** `PaymentService::complete()` only updates the payment status. It doesn't trigger any subscription state transitions. This creates a hidden second path for payment completion that bypasses subscription updates.

**Fix:** Either deprecate `PaymentService::complete()` or add subscription transition logic.

**Files:**
- `Backend/app/Services/Billing/PaymentService.php` (lines 41-59)

---

## ⚪ LOW GAPS

### L1 - Plan price changes don't propagate to existing subscriptions

If an admin changes a plan's price, existing subscriptions with pricing snapshots keep the old price. No recalculation trigger exists.

### L2 - Webhook signature verification always returns true

`PesaPalGateway::verifyWebhookSignature()` returns `true` unconditionally. Any POST to the webhook endpoint is accepted.

### L3 - No billing payment receipt PDF

Only operational payments (sales/invoices) get PDF receipts. Billing/subscription payments don't generate receipts.

### L4 - No rate limiting on payment initiation

Repeated failed payment initiations are not throttled.

### L5 - Console commands not documented

`SubscriptionsRenew`, `SubscriptionsExpireTrials`, `SubscriptionsSuspendPastDue`, `SubscriptionsCancelAtPeriodEnd` exist but have no documentation or scheduled frequency documentation.

---

## Implementation Order

```
Phase 1 - Critical (C1, C2, C3)
  ├── Fix C1: activateAfterOnboarding accepts TRIAL status
  ├── Fix C2: trial_used set correctly
  └── Fix C3: bypass flow checks payment_type

Phase 2 - Race conditions & state corruption (H1, H2, H3, H4, H5)
  ├── Fix H1: autoApprove handles upgrade_proration
  ├── Fix H2: TRIAL → PAST_DUE not EXPIRED
  ├── Fix H3: grace_used → SUSPENDED directly
  ├── Fix H4: action intent in metadata + backend handling
  └── Fix H5: idempotency key

Phase 3 - Functional completeness (M1, M2, M3, M4, M5, M6, M7)
  ├── Fix M1: SubscriptionGuard offline fallback
  ├── Fix M2: getByBusiness single-fetch
  ├── Fix M3: subscription notifications
  ├── Fix M4: upgrade metadata to_plan_id
  ├── Fix M5: cancel subscription UI
  ├── Fix M6: stale payment reaper
  └── Fix M7: PaymentService.complete()

Phase 4 - Polish (L1, L2, L3, L4, L5)
```

## Acceptance Criteria

- All Critical and High gaps have corresponding fix commits
- Each fix has PHPUnit tests that pass
- Backend billing test suite: 100% pass (existing + new tests)
- Frontend: `tsc --noEmit` clean, Vera fast pass
- No regression in existing subscription lifecycle tests

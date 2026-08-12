# ADR — Payment initiation always opens the gateway redirect_url (upgrade, billing-cycle, register/payment)

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend only. Backend already returns `redirect_url` from `PesaPalGateway::initiate` → `GatewayService::initiatePayment` → `Billing\PaymentController::initiateGateway`, and `HandlesPaymentApproval::handlePaymentType` correctly reconciles every `payment_type` (`upgrade_proration`, `billing_cycle_change`, `onboarding`, `subscription`, `renewal`, `topup`).

## Context

PesaPal is a **redirect-based** gateway (`redirect_mode = TOP_WINDOW`). On initiation it returns a hosted `redirect_url` that the user must visit to complete the payment (card / mobile-money selection). The onboarding and subscription flows already opened it in a new tab, but three payment surfaces ignored `redirect_url` entirely:

- `UpgradeFlowModal` (plan upgrade) — only set `payment_id`, then showed a stuck "Waiting for payment" spinner.
- `BillingCyclePaymentModal` (monthly→yearly proration) — same.
- `PaymentPage` (`/register/payment`, onboarding setup fee) — same.

Result: clicking **Pay** on Upgrade (or billing-cycle change, or the register/payment page) initiated the payment server-side but the user was never taken to the PesaPal page, so they could not complete it.

## Decision

Make every payment-initiation surface open `result.redirect_url` in a new tab, matching the existing `OnboardingPage` and `SubscriptionPaymentModal` pattern:

```ts
if (result.redirect_url) {
  const win = window.open(result.redirect_url, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    setPopupBlocked(true);
  }
}
```

Apply it in:
- `UpgradeFlowModal` `handlePay`
- `BillingCyclePaymentModal` `handlePay`
- `PaymentPage` `handlePay`

Each also gained a `popupBlocked` state and an amber inline notice on the polling/"Waiting for payment" view telling the user pop-ups are blocked so they can allow them or open the link manually. All three reset `popupBlocked` at the start of `handlePay`.

## Why frontend-only

The backend contract is already correct and consistent across every payment type — `redirect_url` is present in the initiate response and the post-payment reconciliation is driven by `payment_type`, not by how the frontend opened the page. No server change was required.

## Consequences

- Upgrade, billing-cycle change, and register/payment flows now open the PesaPal payment page just like onboarding and subscription payments do.
- Users whose pop-up blocker prevents the new tab get a clear inline notice instead of an infinite spinner.
- Gates: FE `npm run vera:fast` (eslint + logic) passed; `npx tsc --noEmit` clean; `npx vitest run` 23/23 passed.

## References

- `src/renderer/modules/settings/UpgradeFlowModal.tsx`
- `src/renderer/modules/settings/BillingCyclePaymentModal.tsx`
- `src/renderer/modules/auth/PaymentPage.tsx`
- Backend (unchanged): `app/Services/Payment/Gateways/PesaPalGateway.php`, `app/Services/Payment/GatewayService.php`, `app/Services/Payment/Concerns/InitiatesGatewayPayments.php`, `app/Http/Controllers/Api/Billing/PaymentController.php`

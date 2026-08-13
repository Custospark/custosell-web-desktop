# ADR — Payment initiation opens the gateway redirect_url via a synchronous popup (Google sign-in pattern)

- **Date:** 2026-08-13
- **Status:** Accepted (supersedes the original "always open redirect_url in a new tab" decision)
- **Stack:** Frontend only. Backend already returns `redirect_url` from `PesaPalGateway::initiate` → `GatewayService::initiatePayment` → `Billing\PaymentController::initiateGateway`, and `HandlesPaymentApproval::handlePaymentType` correctly reconciles every `payment_type` (`upgrade_proration`, `billing_cycle_change`, `onboarding`, `subscription`, `renewal`, `topup`).

## Context

PesaPal is a **redirect-based** gateway (`redirect_mode = TOP_WINDOW`). On initiation it returns a hosted `redirect_url` that the user must visit to complete the payment (card / mobile-money selection).

The first iteration opened the URL from inside the mutation's `onSuccess` callback:

```ts
onSuccess: (result) => {
  if (result.redirect_url) {
    const win = window.open(result.redirect_url, '_blank'); // ← async → popup-blocked
  }
}
```

Because `window.open` was invoked **outside a synchronous user gesture** (after an awaited HTTP round-trip), browsers treated it as a popup and silently blocked it. Users clicked **Pay**, saw the "Waiting for payment" spinner, but the payment page never opened — they were left hanging with no way to complete the payment.

## Decision

Adopt the same pattern Google uses for "Continue with Google": open a blank popup **synchronously inside the click gesture**, then redirect that already-open window to the gateway URL once the API returns it. Synchronous `window.open` in a click handler is never popup-blocked.

A shared hook `usePaymentPopup` encapsulates the flow:

```ts
const { popupBlocked, paymentUrl, openPaymentPopup, redirectPaymentWindow, closePaymentPopup } = usePaymentPopup();

const handlePay = () => {
  openPaymentPopup();          // synchronous → browser allows it
  initiateMutation.mutate(payload, {
    onSuccess: (result) => {
      if (result.redirect_url) redirectPaymentWindow(result.redirect_url); // navigate the open popup
      else closePaymentPopup();                                             // STK-push only, no page needed
    },
    onError: () => closePaymentPopup(),
  });
};
```

- `openPaymentPopup()` opens a named blank popup synchronously and returns whether it succeeded. If blocked, `popupBlocked` becomes true.
- `redirectPaymentWindow(url)` navigates that same popup to `url`; if the popup was closed/blocked it flips `popupBlocked` so the UI can recover.
- A shared `PaymentPopupNotice` component renders a manual **"Open Payment Page"** button (opened from a fresh user gesture) plus guidance whenever the popup was blocked — so the user is never stuck on a spinner.
- All payment surfaces close the popup on unmount (`useEffect(() => closePaymentPopup, [closePaymentPopup])`) and on retry/error/reset handlers.

Applied to every payment-initiation surface:

- `UpgradeFlowModal` `handlePay` — upgrade proration
- `SubscriptionPaymentModal` `handlePay` — subscribe / resubscribe / renew / top-up
- `BillingCyclePaymentModal` `handlePay` — monthly↔yearly proration
- `PaymentPage` `handlePay` — register/payment onboarding setup fee
- `OnboardingPage` `handleStartPayment` — onboarding plan selection setup fee
- `OnboardingStatusScreens.WaitingScreen` — renders the fallback notice

## Device-aware expansion (same day)

The synchronous-popup approach alone is not identical on every runtime:

- **Desktop web** — a sized popup (~600px wide) opened synchronously and redirected. A lightweight loading page is painted into the blank window first (`paintLoading`) so it never looks broken while the initiate request is in flight.
- **Electron** — the payment popup opens as a secure **in-app modal child window**, matching the pre-refactor desktop behavior the user expects:
  - `main.ts` `setWindowOpenHandler` allows the `custosell_payment_window` frame as a child `BrowserWindow` with safe webPreferences — `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, no preload bridge — so the gateway page cannot reach the app's Node/preload APIs.
  - The renderer opens the same named popup synchronously as desktop web; `redirectPaymentWindow` navigates it to the gateway in place.
  - If the child window cannot be opened, it falls back to the `electronShell.openExternal(url)` bridge (IPC `shell:open-external`, preload-exposed, URL-validated to `http(s)` only) which opens the system browser; `openedExternally` flips and `PaymentPopupNotice` shows the blue "Payment opened in your browser…" box with a **Reopen Payment Page** fallback.
  - Any other `window.open` for external http(s) URLs (PDFs, social links) is denied and routed to `shell.openExternal`.
  - The waiting screen always offers a subtle **"Complete payment in your browser"** alternative (`openPaymentInBrowser`), so there is always a user-triggered fallback even when the in-app modal opened fine.
- **Mobile web** — popups/window-features are hostile. The hook opens a plain blank tab synchronously (`window.open('', '_blank')`, no features) then redirects it; the notice copy switches to "your payment tab" wording, and the manual fallback opens the gateway from a fresh gesture. Full-page redirect was considered but the backend callback returns JSON (not a resume redirect), so a new tab keeps the app state and polling alive — the seamless behavior mobile users expect.

## Why frontend-only

The backend contract is already correct and consistent across every payment type — `redirect_url` is present in the initiate response and the post-payment reconciliation is driven by `payment_type`, not by how the frontend opened the page. No server change was required.

## Consequences

- The PesaPal payment page now reliably opens for every payment flow (upgrade, billing-cycle change, subscribe/renew/top-up, onboarding, register/payment) without being popup-blocked.
- Electron opens the gateway in an in-app modal child window (secure webPreferences — no Node access) with a system-browser fallback if it can't open.
- Mobile opens a payment tab that keeps app state and polling alive, with mobile-friendly copy and a manual fallback.
- If a window/tab is still blocked (rare, e.g. aggressive blockers), the user gets a manual **Open Payment Page** button and clear instructions instead of an infinite spinner.
- Even when the modal opens normally, an always-visible **"Complete payment in your browser"** link gives users a second path (system browser on Electron, new tab on web/mobile).
- Polling starts only after the window is opened/redirected, so the user is never "hanging" on a payment screen that has no visible payment page.
- Gates: FE `npm run vera:fast` (eslint + logic) passed; `npx tsc --noEmit` clean; Electron `tsc --project src/tsconfig.json --noEmit` clean.

## References

- `src/renderer/shared/hooks/usePaymentPopup.ts` (new)
- `src/renderer/shared/components/payments/PaymentPopupNotice.tsx` (new)
- `src/main/main.ts` — `setWindowOpenHandler` + `shell:open-external` IPC
- `src/preload/preload.ts` — `electronShell.openExternal` bridge
- `src/renderer/modules/settings/UpgradeFlowModal.tsx`
- `src/renderer/modules/settings/SubscriptionPaymentModal.tsx`
- `src/renderer/modules/settings/BillingCyclePaymentModal.tsx`
- `src/renderer/modules/auth/PaymentPage.tsx`
- `src/renderer/modules/auth/OnboardingPage.tsx`
- `src/renderer/modules/auth/OnboardingStatusScreens.tsx`
- Backend (unchanged): `app/Services/Payment/Gateways/PesaPalGateway.php`, `app/Services/Payment/GatewayService.php`, `app/Services/Payment/Concerns/InitiatesGatewayPayments.php`, `app/Http/Controllers/Api/Billing/PaymentController.php`

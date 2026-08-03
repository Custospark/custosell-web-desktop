# Renewal Top-Up Picker — frontend UX

**Date:** 2026-08-03
**Status:** Accepted
**Related backend ADR:** [`2026-08-03-renewal-top-up.md`](../../../Backend/docs/adr/2026-08-03-renewal-top-up.md)

## Decision

The **Renew Early** action on an active subscription opens a flexible **top-up picker**
(`RenewTopUpModal.tsx`) instead of the single-period renewal payment modal. The user
chooses how many months to prepay; the amount is computed client-side for the preview
and authoritative server-side.

## Why

- A one-period renewal only ever adds exactly one billing cycle. Top-up lets users pay
  in advance for any duration (1–60 months), anchored to the existing
  `next_billing_date` — no schedule drift.
- Amount uses a single consistent rate prorated to the stored billing cycle:
  monthly = `months × price_monthly`, yearly = `months × (price_yearly / 12)`.
- The server recomputes the amount authoritatively (`GatewayService`) and records
  `topup_months` in payment + subscription metadata.

## UI

- Preset chips: 1 mo / 3 mo / 6 mo / 1 yr / 2 yr.
- Custom numeric input (1–60 months).
- Live previews:
  - **Total due** — prorated amount in the business display currency
    (`useUsdToLocal` for non-USD).
  - **New billing date** — extends from `subscription.next_billing_date` (not today),
    so the preview matches what the server applies.
- On confirm, opens `SubscriptionPaymentModal` with `payment_type = "topup"` and
  `topup_months` in both the payload and metadata.

## Entry points

Both the banner button and the current-plan card's "Renew Early" (`renew_early` action)
route to the picker via `PlansTab.tsx`.

## Verification

- `npx tsc --noEmit` + `npm run vera:fast` green.
- Live-validated end-to-end: 3-mo top-up ($135 → date 2029-08-03 → 2029-11-03) and
  6-mo top-up ($270 → date → 2030-05-03) on subscription #6, payments completed with
  `topup_months` recorded.

## Related files

- `src/renderer/modules/settings/RenewTopUpModal.tsx`
- `src/renderer/modules/settings/PlansTab.tsx`
- `src/renderer/modules/settings/SubscriptionPaymentModal.tsx`
- `src/renderer/shared/api/account/SubscriptionQueries.ts` (`topup_months` passthrough)
- `src/renderer/shared/types/index.ts` (`PaymentType` gains `'topup'`)

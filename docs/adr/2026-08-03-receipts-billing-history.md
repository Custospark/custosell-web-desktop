# Subscription Receipts & Unified Billing History - frontend

**Date:** 2026-08-03
**Status:** Accepted
**Related backend ADR:** [`2026-08-03-receipts-billing-history.md`](../../../Backend/docs/adr/2026-08-03-receipts-billing-history.md)

## Decision

The subscription Settings page gains a **Plans** tab and a unified **History** tab:

- **History** (`BillingHistoryTab.tsx`) - one newest-first activity timeline that merges
  payments, scheduled plan changes, and credit applications. Completed payment items
  carry **download receipt** (PDF) and **email receipt** actions (`EmailReceiptModal`).

The initial separate **Payments** tab (`BillingPaymentsTab.tsx`) was removed once a
single History timeline was adopted - the backend `/billing/history` feed already
includes every charge, so a dedicated payments list only duplicated the same rows.

## Why

- Previously the page inlined a raw payments list plus plan-change entries in a single
  block. Receipts (PDF download / email) didn't exist in the UI even though the backend
  added the endpoints in the companion feature.
- A unified `GET /billing/history` feed gives a single chronological view of what the
  account has done (charges, upgrades, credit applications) without each tab re-fetching
  overlapping lists.

## API surface

New endpoints added to `endpoints.ts`:

- `BILLING.RECEIPT` → `GET /billing/payments/{id}/receipt` (PDF, saved to disk).
- `BILLING.RECEIPT_EMAIL` → `POST /billing/payments/{id}/receipt/email`.
- `BILLING.HISTORY` → `GET /billing/history`.

## Frontend structure

- `modules/settings/api/billingReceipts.ts`:
  - `useBillingHistory()` - React Query wrapper over the history feed.
  - `downloadReceiptPdf(id)` - fetches the blob + derives the filename.
  - `saveBlobDownload(blob, filename)` - triggers the browser blob save.
  - `useEmailReceipt()` - mutation that POSTs `{ paymentId, email }` and surfaces toasts.
- `modules/settings/ui/BillingHistoryTab.tsx` - unified timeline with per-item icon/badge,
  pagination, and download/email actions gated to completed payments.
- `modules/settings/ui/EmailReceiptModal.tsx` - asks for the recipient email (prefilled
  with the signed-in user's email) before sending the receipt, standard vault-email style.
- `SubscriptionSettingsPage.tsx` owns only the tab switch and credit banner; the old
  inline payments/plan-change state (queries + pagination) was removed to respect the
  500-line rule.

## Verification

- `npx tsc --noEmit` + `npm run vera:fast` green.
- Backend live smoke test: `GET /billing/history` returns merged feed; `GET /billing/payments/13/receipt`
  returns a valid Custospark-branded PDF (880 KB) with `Content-Disposition: attachment`.

## Related files

- `src/renderer/modules/settings/api/billingReceipts.ts`
- `src/renderer/modules/settings/ui/BillingHistoryTab.tsx`
- `src/renderer/modules/settings/ui/EmailReceiptModal.tsx`
- `src/renderer/modules/settings/SubscriptionSettingsPage.tsx`
- `src/renderer/shared/api/endpoints/endpoints.ts`
- `src/renderer/shared/brand/custosellBrand.ts` (+ support chips in `AccountReferralsHelpTab.tsx`)
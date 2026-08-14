# Upgrade Flow Proration - Cross-Stack Redesign

**Date:** 2026-07-26

## Status

Accepted

## Context

Users upgrading to a higher plan faced two bugs:

1. **Upgrade never applied.** `InitiatePaymentRequest.php` lacked a `metadata` validation rule, causing Laravel's `$request->validated()` to silently drop the metadata payload. The payment was stored with `metadata = null`. When the payment webhook fired `GatewayService::handleUpgradeProration()`, it read `$payment->metadata['to_plan_id']` → `null` → returned without upgrading.

2. **No proration display.** The backend had a complete proration engine (`SubscriptionProrationCalculator`, `PaymentQuoteService`), but the frontend bypassed it entirely. Users were shown the full plan price instead of the prorated difference.

## Decision

Redesign the upgrade flow to match the pattern already working in `OnboardingPage`:

1. **Before payment** - fetch a proration quote (new read-only `GET` endpoint)
2. **Show breakdown** - days remaining, credit, charge, amount due today
3. **User confirms** - call `POST /subscriptions/{id}/upgrade` (changes plan immediately)
4. **If amount due > 0** - initiate payment with the prorated amount
5. **If amount due = 0** - skip payment, refresh
6. **Payment success** - refresh profile

## Changes

### Backend

| File | Change |
|------|--------|
| `InitiatePaymentRequest.php` | Added `'metadata' => ['sometimes', 'array']` validation rule |
| `SubscriptionProrationCalculator.php` | Fixed `periodStart` derivation from `$now` → `$periodEnd` (nextBillingDate), so `daysInPeriod` matches the actual billing period length |
| `SubscriptionController.php` | Added `prorationQuote()` read-only method (returns quote, no side effects) |
| `routes/api/v1/subscriptions.php` | Added `GET subscriptions/{id}/proration-quote` route |

### Frontend

| File | Change |
|------|--------|
| `endpoints.ts` | Added `PRORATION_QUOTE` endpoint constant |
| `SubscriptionQueries.ts` | Added `useUpgradeQuote()` hook + exported `UpgradeQuote` / `ProrationDetails` types |
| `UpgradeFlowModal.tsx` | **New** self-contained modal: quote → confirm → upgrade API → pay → done |
| `PlanCard.tsx` | **New** - extracted from PlansTab (file-size compliance) |
| `PlansTab.tsx` | Wired upgrade button to `UpgradeFlowModal` instead of `SubscriptionPaymentModal` |

## Consequences

- Upgrades now apply immediately via the upgrade API (not reliant on payment webhook)
- Users see a clear proration breakdown before confirming
- Payment uses the prorated amount, not the full plan price (fair billing)
- Payment webhook still carries `to_plan_id` in metadata as a safety net
- `handleUpgradeProration` early-returns if the plan is already changed (idempotent)

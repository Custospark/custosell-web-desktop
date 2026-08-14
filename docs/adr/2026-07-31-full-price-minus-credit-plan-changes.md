# Full New Plan Price Minus Unused Credit - Unified Plan-Change Rule

**Date:** 2026-07-31

## Status

Accepted

## Context

When a user on Plan A upgrades to Plan B, the backend prorated the **charge** by days remaining
(e.g. Enterprise $135 × 15/30 = $67.50) and then subtracted the unused credit ($27), producing a
due of **$40.50 ≈ USh 150,197.90** for a Professional → Enterprise upgrade with 15/30 days left.

Oscar (product owner) identified the intended model: the unused credit should be **deducted from
the next plan the user is subscribing to - the full price**, not from a prorated slice of it.
Expected due: full Enterprise $135 − $27 credit = **$108 ≈ USh 400,527.72** (~400,000 UGX).

## Decision

For **ALL immediate plan changes** (upgrade, downgrade, billing-cycle change) on a subscription:

- **charge** = the **full price of the target plan** for the target billing cycle (monthly or
  yearly) - never prorated by days remaining
- **credit** = unused credit from the current plan, still prorated by unused days
  (`old_price × days_remaining / days_in_period`)
- **proration_due** = `max(0, charge − credit)`
- **next_billing_date** resets to **today + target period** (monthly +1 month, yearly +1 year) when
  a paid or zero-cost plan change completes

The trial rule is unchanged: a trial has no unused credit, so due = full target plan price.

## Changes

### Backend

| File | Change |
|------|--------|
| `SubscriptionProrationCalculator.php` | `charge = full new plan price` (removed `× daysRemaining/daysInPeriod`); credit stays prorated |
| `PaymentQuoteService.php` | Cycle-change branch unified: both monthly and yearly targets use **full target price − credit** (removed the prorated-monthly branch) |
| `SubscriptionService.php` | `changePlan()` now resets `next_billing_date` to `now + target period` (matches `applyBillingCycleChange`) - prevents double-billing when upgrade completes mid-period |
| `tests/.../ProrationAccuracyTest.php` | `expectedProration()` helper: `charge = full new price` |
| `tests/.../BillingLifecycleTest.php` | New `test_active_upgrade_quote_charges_full_new_price_minus_unused_credit`; `charge` assertion in Tim Berners-Lee upgrade test |

### Frontend

| File | Change |
|------|--------|
| `UpgradeFlowConfirmStep.tsx` | Label `Charge for remaining days` → `New plan price`; copy → "Review the charges before confirming." (no arithmetic change - it displays the backend's full-price charge) |

## Consequences

- What the user sees (full new price − credit) equals what is charged.
- No more under-charging on upgrades; no more double-billing (period resets to today).
- Zero-cost path (`processZeroCostUpgrade`) still triggers when credit ≥ full target price; the
  period also resets there.
- Downgrades remain free (charge = lower full price, credit usually covers it → $0 due), matching
  existing no-payment behavior.
- Tests: `ProrationAccuracyTest` 10/10, Unit/Billing 131 pass, `SubscriptionBillingTest` 22 pass,
  `ForensicGapFixTest` 19 pass.

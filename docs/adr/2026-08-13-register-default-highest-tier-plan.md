# Register defaults new business accounts to the highest-tier plan

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend + Backend (registration default + plan-action matrix)

## Context

Businesses registering on the platform were defaulted to `businessPlans[0]` — the
plan with the lowest `sort_order` (currently Essential). This meant new users only
experienced a subset of the product during their 30-day trial. Registration also
depended on the frontend successfully loading active plans — if the plans request
failed, the user was blocked with *"Plans could not be loaded."*

Meanwhile, all legacy subscriptions were upgraded to Enterprise via backend
migration `2026_08_13_000001` so existing businesses could see the full product
and then pick their tier.

## Decision

1. **Backend assigns the default plan.** `BusinessService::register()` now resolves
   the plan itself: it uses the client-sent `plan_id` when present, otherwise it
   defaults to the **highest-tier active business plan** (highest `sort_order`, then
   highest price — currently Enterprise). A subscription is always created.
2. **Plan fields are optional on the request.** `BusinessRegisterRequest` already
   marked `plan_id`/`billing_cycle` as `sometimes`; the controller and service no
   longer require them, and the response always loads the subscription.
3. **Frontend no longer forces plans at registration.** `RegisterPage` no longer
   loads active plans, computes a default, or blocks submission when plans fail.
   It sends `plan_id`/`billing_cycle` only when the user arrived from a pricing
   page (`location.state`). The "Plans could not be loaded" dead-end is gone.

## Consequence: plan-action matrix on trial

While a subscription is on **trial** (`trial_paid` / `trial_unpaid`), every plan
card now shows **"Subscribe Now"** and routes through the `subscribe` payment flow
(`planActionMatrix.ts`). Previously the trial matrix emitted `Schedule Downgrade`
(lower), `Upgrade` (higher) and `Pay Setup Fee` / `Subscribe Now` (current), but
scheduled downgrades and proration upgrades are only valid once a subscription is
**active** (paid). Trial users now pick any plan by subscribing directly.

Similarly, on **past_due** ("Payment Due") the matrix no longer offers
`Schedule Downgrade` or `Upgrade` for non-current plans — those require an active
subscription. Every plan card (current, higher, lower) shows **Reactivate**
(routed through the payment flow with `{ action: 'reactivate', to_plan_id }`).
Reactivating a plan clears the outstanding balance and restores the subscription.

## Consequences

- New businesses get full module access during trial (Enterprise = everything),
  whether they pick a plan at signup or not.
- Downgrade path (via Settings → plan) is the intended "choose what they want later"
  and only appears once the subscription is active.
- Registration no longer has a frontend dependency on plan availability.
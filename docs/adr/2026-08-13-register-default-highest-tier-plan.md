# Register defaults new business accounts to the highest-tier plan

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend (registration default), aligned with Backend legacy upgrade

## Context

Businesses registering on the platform were defaulted to `businessPlans[0]` — the
plan with the lowest `sort_order` (currently Essential). This meant new users only
experienced a subset of the product during their 30-day trial.

Meanwhile, all legacy subscriptions were upgraded to Enterprise via backend
migration `2026_08_13_000001` so existing businesses could see the full product
and then pick their tier.

## Decision

New business registrations default to the **highest-tier business plan** (highest
`sort_order` among `type !== 'personal'` plans) instead of the lowest, so new users
experience the full value of the platform during their trial and choose their plan
later.

- Explicit plan selection from a pricing page (`location.state.planId`) still wins.
- The default is computed from the active plans list; if no business plans exist,
  `planId` stays `undefined` and the existing "no plans available" UI shows.

## Consequences

- New businesses get full module access during trial (Enterprise = everything).
- Downgrade path (via Settings → plan) is the intended "choose what they want later."
- No backend change required: registration already sends the chosen `plan_id`.
# Subscription — Frontend User Stories

Mirrors the backend [billing-scenarios.md](../../../Backend/docs/billing-scenarios.md) from the frontend (Electron + React + TypeScript) perspective. Covers the SubscriptionGuard middleware, route protection, overlay UI, and redirect behavior.

## Characters

| Person | Business | Location | Plan |
|--------|----------|----------|------|
| **Oscar** | Kikuubo Retail Ltd | Kampala, UGX | Essential → Professional |
| **Grace** | Sino Hardware & General Supplies | Gulu, UGX | Professional |
| **David** | Pearl Tech Solutions | Kampala, USD | Enterprise |
| **Sarah** | Mama K's Foods | Jinja, UGX | Essential (trial only) |

---

## Architecture

```
User action → Route match → SubscriptionGuard (checks GET /subscriptions/access)
                                ├── has_access: true  → render <Outlet/> (normal page)
                                └── has_access: false → render overlay (block UX, link to subscription settings)

Login → getDefaultRoute() checks subscription.status
         ├── onboarding_fee_paid === false → /register/payment
         ├── status in [expired, suspended, cancelled] → /settings/subscription
         └── else → normal landing (dashboard / first accessible module)
```

### Guarded routes

SubscriptionGuard wraps **all business modules** inside the Layout shell:

| Guarded | Not Guarded |
|---------|-------------|
| Dashboard, Sales, Inventory, Customers, Expenses | `/settings/*` (contains `/settings/subscription`) |
| Pipeline, Estimates, Account, Documents | `/platform/*` (platform admin routes) |
| HR, Accounting, Forecasting, Guide | `/onboarding`, `/register/payment` |

### React Query caching

`useSubscriptionAccess` uses `staleTime: 30_000` so the guard does not re-fetch on every render. After payment or subscription changes, the caller (e.g. `SubscriptionSettingsPage`) should call `queryClient.invalidateQueries({ queryKey: ['subscription', 'access'] })` to trigger a re-check.

---

## Scenario 1: Oscar Signs Up — Free Trial

Oscar registers Kikuubo Retail Ltd, chooses Essential (UGX 75,000/mo, 30-day trial). He lands on the app.

### Frontend flow

1. Registration → `POST /api/v1/auth/register` → backend creates business + trial subscription
2. `AuthBootstrap` calls `GET /api/v1/auth/me` → Redux stores user with `business.subscription.status = 'trial'`
3. `getDefaultRoute()` checks:
   - `onboarding_fee_paid === false` → **redirects to `/register/payment`**
4. Oscar pays onboarding fee (150,000 UGX) via PaymentPage
5. PaymentPage calls `refetchProfile()` → Redux updates → `onboarding_fee_paid = true`
6. `getDefaultRoute()` now:
   - `status = 'trial'` → not in blocked list → normal landing (dashboard)
7. `SubscriptionGuard` checks `GET /subscriptions/access` → `{ "has_access": true }`
8. Oscar sees the POS and can use all features immediately

### Overlay behavior

No overlay — access granted.

### Failure states

| Condition | Result | How it's handled |
|-----------|--------|-------------------|
| Registration fails | 422 form errors | `RegisterPage` shows field validation |
| Onboarding payment fails | Toast error | `PaymentPage` shows error, retry allowed |
| PaymentPage redirects but subscription not yet trial | Guard isLoading | `CustosellLoader` spinner, auto-retry on query refetch |
| Fetching access endpoint fails | `isError = true` | Guard renders `Outlet` (fail-open — allow access) |

---

## Scenario 2: Oscar's Trial Payment (Activation)

Day 10 of trial. Oscar pays via PesaPal to activate the subscription.

### Frontend flow

1. Oscar navigates to `/settings/subscription`
2. SubscriptionSettingsPage shows current status = trial, next_billing_date, "Subscribe Now" button
3. Oscar clicks Subscribe → payment initiation flow via PesaPal redirect
4. Backend webhook processes payment → subscription status becomes `active`
5. On return from PesaPal, frontend calls `refetchProfile()` (from `PaymentPage`) or `queryClient.invalidateQueries` (from `SubscriptionSettingsPage`)

### Overlay behavior

No overlay. Oscar continues using the POS uninterrupted.

### Failure states

| Condition | Result | How it's handled |
|-----------|--------|-------------------|
| PesaPal redirect interrupted | User returns to app | `PaymentPage` polls status, retries |
| Webhook arrives before user returns | `refetchProfile` returns active | Instant access |
| Payment fails | Toast error | User retries from SubscriptionSettingsPage |
| Duplicate payment | Backend idempotent | No double-charge, toast shows "already paid" |

---

## Scenario 3: Payment Bounces — Grace Period

Oscar's second-month payment fails. Cron marks subscription `past_due` with 7-day grace.

### Frontend flow

1. SubscriptionGuard calls `GET /subscriptions/access` → `{ "has_access": true }`
2. Grace period active — user still has full access
3. Sidebar or SubscriptionSettingsPage shows subtle warning badge: "Payment overdue — 5 days remaining"

### Overlay behavior

No overlay. Grace period means business as usual.

### After grace expires

1. Cron suspends subscription → `status = 'suspended'`
2. Next SubscriptionGuard check (or within 30s stale time) sees `has_access: false`
3. Overlay renders:

```
┌─────────────────────────────────────┐
│          ┌──────────┐               │
│          │ Building │               │
│          │  icon    │               │
│          └──────────┘               │
│  Subscription suspended             │
│  Your subscription has been         │
│  suspended due to non-payment.      │
│  Reactivate to regain access.       │
│                                     │
│  [Manage subscription]  [Refresh]   │
└─────────────────────────────────────┘
```

4. Clicking "Manage subscription" navigates to `/settings/subscription`
5. User can view payment options, make payment, reactivate
6. Clicking "Refresh" reloads the app (re-checks access)

### Failure states

| Condition | Result | How it's handled |
|-----------|--------|-------------------|
| User navigates while suspended | Overlay blocks all guarded routes | Settings subscription page still accessible |
| User pays while overlay is visible | Refresh or next 30s poll re-checks | Overlay disappears, content appears |
| Access endpoint fails while suspended | `isError = true` | Guard renders overlay (fail-closed — safe for suspended) |

---

## Scenario 4: Grace Upgrades from Essential to Professional

Grace from Sino Hardware (Gulu) is on Professional (UGX 200,000/mo). She upgrades to Enterprise mid-cycle.

### Frontend flow

1. Grace navigates to `/settings/subscription`
2. SubscriptionSettingsPage shows current plan, "Change Plan" button
3. She selects Enterprise, chooses "Upgrade immediately"
4. `POST /api/v1/subscriptions/{id}/upgrade` returns proration amount (180,000 UGX)
5. Payment flow: initiates payment for the prorated difference
6. On completion, `queryClient.invalidateQueries` -> plan_id updated, Enterprise features available

### Overlay behavior

No overlay. Grace has an active subscription throughout.

### Downgrade

1. Grace selects Professional, chooses "Downgrade at period end"
2. `POST /api/v1/subscriptions/{id}/downgrade` creates `SubscriptionScheduledChange`
3. SubscriptionSettingsPage shows "Pending change to Professional from next billing date"
4. She can cancel the pending change from the same page

---

## Scenario 5: David Cancels at Period End

David (Pearl Tech Solutions, Enterprise $135/mo) cancels at period end.

### Frontend flow

1. David navigates to `/settings/subscription`
2. Sees "Cancel Subscription" with two options:
   - "Cancel at period end" (default)
   - "Cancel immediately" (admin only / confirm dialog)
3. Chooses "Cancel at period end"
4. `POST /api/v1/subscriptions/{id}/cancel` → success
5. SubscriptionSettingsPage shows status = "Active (cancels on [date])"
6. David keeps full access until `next_billing_date`

### Overlay behavior

No overlay. `cancel_at_period_end = true`, but `status = 'active'`, so `hasAccess() = true`.

### At period end

Cron processes the cancellation → `status = 'cancelled'`. Next SubscriptionGuard check → overlay:

```
┌─────────────────────────────────────┐
│  Subscription cancelled             │
│  Your subscription has been         │
│  cancelled. Choose a new plan to    │
│  continue using Custosell.          │
│                                     │
│  [Manage subscription]  [Refresh]   │
└─────────────────────────────────────┘
```

### Failure states

| Condition | Result | How it's handled |
|-----------|--------|-------------------|
| Already cancelled | API returns error | Toast: "Subscription is already ended" |
| Immediate cancel by mistake | No undo | Confirmation dialog with clear warning |

---

## Scenario 6: Sarah's Trial Expires (No Payment)

Sarah (Mama K's Foods, Jinja) never pays. 30-day trial expires.

### Frontend flow

1. Cron marks subscription `expired`
2. Next time Sarah opens the app (or 30s poll), SubscriptionGuard sees `has_access: false`
3. Overlay:

```
┌─────────────────────────────────────┐
│  Trial expired                      │
│  Your free trial has ended.         │
│  Subscribe to a plan to continue    │
│  using Custosell.                   │
│                                     │
│  [Manage subscription]  [Refresh]   │
└─────────────────────────────────────┘
```

4. "Manage subscription" → `/settings/subscription` → shows plan selection
5. She can subscribe (but backend blocks duplicate sub — needs support reset)

---

## Scenario 7: Admin Force-Cancels (Immediate)

A dispute arises. Backend admin force-cancels Oscar's subscription immediately.

### Frontend flow

1. Subscription status becomes `cancelled` immediately
2. If Oscar has the app open, next SubscriptionGuard poll sees `has_access: false`
3. Overlay renders (same as Scenario 5 overlay but with "cancelled" messaging)
4. Oscar can still access `/settings/subscription` to view status and contact support

### Key difference from period-end cancel

| Aspect | Period-end | Immediate |
|--------|-----------|-----------|
| `has_access` during current period | `true` | `false` immediately |
| Overlay shows | No overlay until period ends | Overlay immediately |
| User can self-recover | No (must re-subscribe) | No (contact support) |

---

## Scenario 8: Suspended / Expired User Tries Any Route

Grace (suspended) or Sarah (expired) tries to navigate to any guarded route.

### What happens

1. `SubscriptionGuard`'s `useSubscriptionAccess` fires
2. `GET /subscriptions/access` → `{ "has_access": false }`
3. Guard renders overlay specific to their status:

| Status | Overlay Title | Overlay Description |
|--------|--------------|---------------------|
| `suspended` | Subscription suspended | "Your subscription has been suspended due to non-payment. Reactivate to regain access." |
| `cancelled` | Subscription cancelled | "Your subscription has been cancelled. Choose a new plan to continue using Custosell." |
| `expired` | Trial expired | "Your free trial has ended. Subscribe to a plan to continue using Custosell." |
| `past_due` | Payment required | "Your subscription payment is past due. Make a payment to restore full access." |
| no subscription | No active subscription | "You do not have an active subscription. Choose a plan to get started." |

### Route exemptions

These routes are **never blocked** by SubscriptionGuard:

| Route | Why |
|-------|-----|
| `/settings/subscription` | User must access this to renew / change plan |
| `/settings/*` | All settings pages (business info, staff, tax) |
| `/platform/*` | Platform admin routes (manage other businesses) |
| `/onboarding` | Before subscription exists |
| `/register/payment` | Must pay onboarding fee before subscribing |
| `/account/*` | Profile, notifications |
| `/discover/*` | Storefront (shoppers, not business users) |
| `/guide/*` | Help articles, FAQ |

---

## Login Redirect Behavior

When a user logs in, `getDefaultRoute()` determines where they land:

1. No subscription (or `onboarding_fee_paid === false`) → `/register/payment`
2. Status in `[expired, suspended, cancelled]` → `/settings/subscription`
3. All other statuses → normal landing (first accessible module via priority list)

### Edge cases

| Scenario | Redirect target | Why |
|----------|----------------|-----|
| Staff user, business suspended | `/settings/subscription` | Staff can view but probably can't renew (owner must) |
| Staff user, onboarding unpaid | `/register/payment` | Staff redirected to payment (owner handles) |
| No business subscription at all | `/register/payment` | Redirect to complete onboarding |
| Active sub, onboarding paid | `/app` → `ModuleLandingRedirect` → first accessible module | Normal flow |

---

## Offline Behavior (Mid-session Suspension)

The SubscriptionGuard polls every 30s. If the subscription is suspended mid-session while the user is offline:

| Scenario | Behavior |
|----------|----------|
| User offline when suspension happens | Guard still shows cached `has_access: true` (stale data) — user continues working |
| User comes back online | Next 30s poll fetches fresh data → `has_access: false` → overlay appears |
| User in the middle of a sale | Overlay does not interrupt — user can complete the current transaction |
| User navigates to a new page | Guard re-renders → overlay blocks navigation |

---

## State Machine Summary (Frontend)

```
                    ┌──────────────────────────────┐
                    │        TRIAL                  │
                    │  SubscriptionGuard: ✅        │
                    │  getDefaultRoute: landing     │
                    └──────────┬───────────────────┘
                               │ pay onboarding
                               ▼
                    ┌──────────────────────────────┐
          ┌────────│         ACTIVE                │◄────────────┐
          │        │  SubscriptionGuard: ✅        │             │
          │        │  getDefaultRoute: landing     │             │
          │        └──┬──────────┬────────────┬────┘             │
          │           │          │            │                  │
          │      payment       cancel       cancel              │
          │       fails      (period-end)  (immediate)          │
          │           │          │            │                  │
          │           ▼          ▼            ▼                  │
          │  ┌────────────┐ ┌──────────┐ ┌───────────┐         │
          │  │ PAST_DUE   │ │ ACTIVE   │ │ CANCELLED │  renewal│
          │  │ (grace 7d) │ │ (cancled)│ │ (immed.)  │         │
          │  │ Guard: ✅  │ │ Guard: ✅│ │ Guard: ❌ │         │
          │  └─────┬──────┘ └────┬─────┘ └───────────┘         │
          │        │             │                              │
          │   grace expires      │ period ends                  │
          │        ▼             ▼                              │
          │  ┌────────────┐ ┌──────────┐                        │
          │  │ SUSPENDED  │ │ CANCELLED│                        │
          │  │ Guard: ❌  │ │ Guard: ❌│                        │
          │  └────────────┘ └──────────┘                        │
          │                                                     │
          └────────────────── reactivate ──────────────────────┘

          ┌──────────────┐
          │   EXPIRED    │
          │  Guard: ❌   │
          └──────────────┘
```

---

## Referral ↔ Subscription Integration

When a business subscribes using a referral code, the system tracks the referral discount but **does not reduce the subscription price**. The discount is informational only.

### How it works

1. `SubscriptionService::subscribe()` records the referral via `ReferralService::processReferral()`
2. `processReferral()` calculates `discount_applied` based on the referral code's discount type:
   - **Percentage**: `price_monthly × value ÷ 100`
   - **Flat**: `discount_value` directly
   - **Free month**: equals `price_monthly`
3. The subscription's `price_monthly` is **never modified** — the business pays full price
4. On activation, `activateForSubscription()` calls `markActive()` which:
   - Calculates `reward_amount` for the referrer (based on **full** price_monthly)
   - Calculates `commission_earned` for sales reps (based on **full** price_monthly)
   - Does NOT reduce the referred business's subscription price

### Design decision

The `discount_applied` field on the Referral model is **informational/tracking only**. The actual billing/pricing pipeline does not read this field. If discount application is needed in the future, the plumbing would need to be wired from `discount_applied` into:
- Invoice generation (reduce amount due)
- Payment initiation (charge less)
- Subscription `price_monthly` or a new `effective_price` field

### User stories tested

| # | Story | What's validated |
|---|-------|------------------|
| 1 | Percentage discount | `discount_applied` = 10% of price, `price_monthly` unchanged |
| 2 | Flat discount | `discount_applied` = 50,000 UGX, `price_monthly` unchanged |
| 3 | Free month discount | `discount_applied` = price_monthly, `price_monthly` unchanged |
| 4 | Full lifecycle (subscribe → referral → activate) | Referral created in PENDING, reward=0 before activation, discount set |
| 5 | Reward on full price | `reward_amount` calculated on full `price_monthly`, not discounted value |
| 6 | Commission on full price | Sales rep commission calculated on full `price_monthly`, not discounted |
| 7 | All discount types leave price unchanged | Percentage, flat, and free month all result in same full price |
| 8 | Grace once per subscription | `grace_used` flag prevents second grace period |

### Grace period

Grace is granted **once per subscription lifecycle**. The `grace_used` boolean on the Subscription model is set when `markPastDue()` is called, and subsequent calls throw `RuntimeException`. Since each business can have at most one active subscription, this effectively means once per business.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/renderer/app/routes/middleware/SubscriptionGuard.tsx` | Route guard component — fetches access, renders overlay or Outlet |
| `src/renderer/app/routes/index.tsx` | Route tree — SubscriptionGuard wraps all business modules |
| `src/renderer/shared/utils/moduleAccess.ts` | `getDefaultRoute()` — redirect logic after login |
| `src/renderer/modules/settings/SubscriptionSettingsPage.tsx` | Target page for "Manage subscription" button in overlay |
| `src/renderer/app/routes/constants/shared.paths.ts` | Route path constants including `SETTINGS.SUBSCRIPTION` |
| `src/renderer/shared/api/endpoints/endpoints.ts` | API endpoint constants including `SUBSCRIPTIONS.ACCESS` |

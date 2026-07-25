# Referral & Commission System

Every user gets a referral code on registration. Businesses can enter a referral code on a dedicated page after signup, earning the referrer rewards and the referee a discount.

## Flow

```
User registers
  → Auto-create ReferralCode (owner_user_id=user.id, discount 10%, reward=free_month)
  → Redirect to /referral page

ReferralEntryPage (/referral)
  → User enters referral code → POST /api/v1/referrals/apply
  → Backend validates (isValid? not self-owned? not duplicate?)
  → Creates PENDING Referral with discount_applied and reward_amount calculated
  → Redirect to /onboarding

Payment succeeds → Subscription activated
  → activateSubscription() / activateAfterOnboarding()
  → ReferralService::activateForSubscription() → PENDING → ACTIVE

Referrer views /pipeline/referrals
  → GET /api/v1/referrals/earnings/me
  → Shows: referral code, total earned, pending rewards, history table
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/referral` | `ReferralEntryPage` | Enter a referral code (post-registration) |
| `/pipeline/referrals` | `PipelineReferralsPage` | Commission/earnings dashboard |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/referrals/apply` | Apply a referral code to the current business's subscription |
| GET | `/api/v1/referrals/earnings/me` | Get authenticated user's referral earnings and history |

## Key Backend Changes

- **User model** — added `referralCode()` hasOne relationship
- **BusinessService::register()** — auto-creates ReferralCode for new user (10% discount, free_month reward)
- **ReferralService::processReferral()** — now calculates `discount_applied` and `reward_amount` based on subscription price; prevents self-use
- **ReferralService::activateForSubscription()** — hooks into subscription activation to transition PENDING → ACTIVE
- **SubscriptionService** — `activateSubscription()` and `activateAfterOnboarding()` now call `activateForSubscription()`
- **Migration** — `2026_07_25_000003` backfills codes for existing users without one

## Business Rules

- A business cannot use its own owner's referral code
- A business can only use a referral code once
- Referral must be valid (active, not expired, max_uses not reached)
- Discount and reward are calculated at referral creation time based on subscription's monthly price

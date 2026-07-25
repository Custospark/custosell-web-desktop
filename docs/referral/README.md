# Referral & Commission System

## Referral Code Standard

**Format:** 6-character uppercase alphanumeric, excluding ambiguous characters.

```
Charset:   A B C D E F G H J K L M N P Q R S T U V W X Y Z  2 3 4 5 6 7 8 9
Excluded:  O 0 I 1 L (avoid confusion when reading/writing)
Example:   A3X9K2  ->  "AYE-THREE-EX-NINE-KAY-TWO"
```

**Generation:** Random selection from charset using `random_int()`. Codes are unique by DB constraint. Optionally prefixed (e.g. `SALES-A3X9K2` for sales rep codes).

---

## How the System Works

### Complete Data Flow

```
1. USER REGISTERS
       │
       ▼
   BusinessService::register()
   ├── Creates User
   ├── Creates ReferralCode (owner_user_id = user.id, discount 10%, reward free_month)
   ├── Creates Business
   ├── Creates Subscription (TRIAL or PAST_DUE)
       │
       ▼
2. POST-REGISTRATION
   Redirected to /referral page
   ├── Enters referral code → POST /api/v1/referrals/apply
   │   └── ReferralService::processReferral()
   │       ├── Validates: is_active? not expired? max_uses?
   │       ├── Prevents self-use (own code not allowed)
   │       ├── Prevents duplicate (one code per business)
   │       ├── Calculates discount_applied from subscription price
   │       ├── Calculates reward_amount for referrer
   │       └── Creates Referral record (status: PENDING)
   └── Or skips → proceeds to /onboarding
       │
       ▼
3. ONBOARDING PAYMENT SUCCEEDS
   SubscriptionService::activateAfterOnboarding()
   ├── Subscription status → ACTIVE
   └── ReferralService::activateForSubscription()
       └── Referral: PENDING → ACTIVE (converted_at = now)
           ├── If code belongs to a sales rep:
           │   └── Calculates commission_earned (percentage or flat)
           └── Referrer's reward is now pending
       │
       ▼
4. REFERRER VIEWS DASHBOARD
   /pipeline/referrals
   ├── Sees their referral code (can copy/share)
   ├── Sees total earned rewards
   ├── Sees pending rewards (not yet paid out)
   ├── Sees referral history table
   └── If sales rep: sees commission rate, available to claim, total earned
       │
       ▼
5. PLATFORM ADMIN
   /platform/sales-reps
   ├── Manages sales reps (create, edit, activate/deactivate)
   ├── Sees each rep's code, referrals, pending commission, paid out
   └── Total commission owed across all reps
```

### Lifecycle States

```
Referral statuses:
  PENDING    → Code entered, payment not yet made
  ACTIVE     → Payment succeeded, referrer's reward pending
  REWARDED   → Reward has been paid out to referrer

Commission flow (sales rep codes only):
  PENDING    → No commission (not yet active)
  ACTIVE     → commission_earned calculated and stored
  REWARDED   → commission_paid = true (admin marks as paid)
```

---

## User Stories

### Story 1: Business-to-Business Referral (Mary → John)

**Characters:**
- **Mary** — owns "Kampala Kitchen Supplies", has referral code `A3X9K2`
- **John** — starting "Jinja Farm Equipment", signs up for Custosell

**Scenario:**
1. Mary shares her code `A3X9K2` with John
2. John registers his business. After registration, the system redirects him to `/referral`
3. John enters `A3X9K2`. The system validates:
   - Code is active ✓
   - Code is not John's own ✓ (different owner)
   - John has not used this code before ✓
4. System calculates: John's plan is 50,000 UGX/month. Mary's code gives 10% discount → John saves 5,000 UGX. Mary earns a free month reward (50,000 UGX).
5. John completes onboarding payment → subscription activates
6. Mary's referral transitions PENDING → ACTIVE. Mary now has 50,000 UGX pending rewards
7. John sees "Referral discount applied: 5,000 UGX" on his subscription
8. Mary visits `/pipeline/referrals` → sees her code, 1 active referral, 50,000 UGX pending reward

### Story 2: Sales Representative Commission (Peter)

**Characters:**
- **Peter** — Custosell sales representative
- **Grace** — signs up using Peter's code
- **Sarah** — Platform admin at Custosell

**Scenario:**
1. Sarah (platform admin) goes to `/platform/sales-reps` → clicks "Add Sales Rep"
2. Sarah enters Peter's User ID, sets commission rate to **10% (percentage)**
3. System creates a ReferralCode owned by `SALES_REP` with code `SALES-M2X7N4`
4. Peter sees his code on `/pipeline/referrals` and shares it with prospects
5. Grace registers using Peter's code `SALES-M2X7N4`
6. Grace's subscription activates → Peter's referral becomes ACTIVE
7. System auto-calculates: Grace's monthly price is 100,000 UGX.
   Peter's commission = 10% × 100,000 = **10,000 UGX** → stored as `commission_earned`
8. Peter visits `/pipeline/referrals`:
   - Sees: "Sales Representative Commission"
   - Rate: 10% | Available to Claim: 10,000 UGX | Total Earned: 10,000 UGX
   - Message: "Contact the Custosell team to claim your pending commission"
9. Sarah visits `/platform/sales-reps`:
   - Sees Peter in the list: Code `SALES-M2X7N4`, 1 referral, 10,000 UGX pending, 0 UGX paid out
   - Total commission owed across all reps: 10,000 UGX

### Story 3: Flat Commission Rate (David)

**Characters:**
- **David** — Custosell partner with a flat commission deal
- **Platform Admin** — sets up David's agreement

**Scenario:**
1. Admin creates David as a Sales Rep with `commission_type = flat`, `commission_rate = 50,000`
2. David's code `SALES-F8G3D2` is auto-generated
3. A business signs up using David's code
4. On activation: David earns a flat **50,000 UGX** regardless of the plan price
5. David sees "Rate: 50,000 UGX" on his pipeline dashboard

### Story 4: Trying to Use Own Code (Blocked)

**Characters:**
- **Alice** — owns "Nile Tech Solutions", has referral code `V7R5Q2`

**Scenario:**
1. Alice tries to enter her own code `V7R5Q2` during her business's subscription
2. System blocks it: **"You cannot use your own referral code"**
3. Alice must use someone else's code or skip

### Story 5: Reusing a Code (Blocked)

**Characters:**
- **Bob** — referral code owner
- **Charlie** — owns "Mountain Coffee Exports"
- **Diana** — also at "Mountain Coffee Exports" (same business)

**Scenario:**
1. Charlie enters Bob's code → works, referral created
2. Charlie cancels the business, Diana re-registers the same business
3. Diana tries to enter Bob's code again → blocked: **"This business has already used this referral code"**
4. The check is by `referred_business_id` (business, not user)

### Story 6: Expired or Maxed-Out Code

**Characters:**
- **Frank** — has a campaign code with `max_uses = 5`, already used 5 times

**Scenario:**
1. A new business tries to enter Frank's code
2. `isValid()` returns false because `used_count >= max_uses`
3. Blocked: **"Referral code is invalid or expired"**

### Story 7: Platform Admin Manages Sales Reps and Payouts

**Characters:**
- **Sarah** — Platform admin

**Scenario:**
1. Sarah opens `/platform/sales-reps`
2. Sees a summary: 3 active reps, 150,000 UGX total commission owed, 75,000 UGX paid out
3. Sarah clicks "Edit" on a rep → can change commission rate, type, or deactivate
4. Sarah sees each rep's pending commission and can reach out to process payouts
5. When a payout is processed manually, `commission_paid` is set to true on the referral records

---

## Migrations to Run

```bash
php artisan migrate
```

This runs three new migrations:
| Migration | Purpose |
|-----------|---------|
| `2026_07_25_000003_backfill_referral_codes_for_existing_users` | Creates 6-char codes for all users who don't have one |
| `2026_07_25_000004_add_commission_to_referrals_table` | Adds `commission_earned` and `commission_paid` columns |

---

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/referral` | Authenticated | Enter a referral code after registration |
| `/pipeline/referrals` | Pipeline module | User's referral earnings & commission dashboard |
| `/platform/sales-reps` | Platform admin | Manage sales reps and view commission stats |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/referrals/apply` | Apply a referral code to current subscription |
| GET | `/api/v1/referrals/earnings/me` | Current user's referral earnings + commission |
| GET | `/api/v1/referrals` | All referrals (admin) |
| POST | `/api/v1/sales-reps` | Create a sales rep |
| GET | `/api/v1/sales-reps/earnings/all` | All sales reps with aggregated commission |
| GET | `/api/v1/sales-reps/earnings/mine` | Current sales rep's detailed earnings |
| GET | `/api/v1/sales-reps/{id}/earnings` | Single sales rep's earnings with referral history |

## Key Business Rules

1. **Self-use blocked** — a business cannot use its own owner's referral code
2. **One-time per business** — a business can only use a specific code once
3. **Code validity** — code must be active, not expired, under max_uses
4. **Commission triggers on activation** — only calculated when subscription transitions to ACTIVE (payment succeeds)
5. **Reward/commission calculated at creation** — uses the subscription's monthly price at the time of referral application
6. **Sales rep commission is separate from referrer reward** — the referrer gets a reward (e.g. free month), and the sales rep gets commission on top

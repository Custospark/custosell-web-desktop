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
- **Mary** - owns "Kampala Kitchen Supplies", has referral code `A3X9K2`
- **John** - starting "Jinja Farm Equipment", signs up for Custosell

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
- **Peter** - Custosell sales representative
- **Grace** - signs up using Peter's code
- **Sarah** - Platform admin at Custosell

**Scenario:**
1. Sarah (platform admin) goes to `/platform/sales-reps` → clicks "Add Sales Rep"
2. Sarah enters Peter's email `peter@custosell.com` in the email field. The system searches and finds Peter's existing user account, showing his name + email in green. Sarah sets a **20% referee discount** and **30% commission (percentage)** and clicks Create.
3. If Peter's account doesn't exist yet, Sarah would type the email, see "No user found" in amber, fill in Peter's name, and the system auto-creates the user account + sales rep + referral code in one step.
4. System creates a ReferralCode owned by `SALES_REP` with code (e.g. `M2X7N4`). The code's `discount_value` = 20 (referee discount, independent of the 30% commission).
5. Peter sees his code on `/pipeline/referrals` and shares it with prospects
6. Grace registers using Peter's code (e.g. `M2X7N4`)
7. Grace's subscription activates → Peter's referral becomes ACTIVE
8. System auto-calculates on the amount Grace ACTUALLY paid (post-discount): Grace's onboarding charge is 100,000 UGX with 20% off → she pays 80,000 UGX.
   Peter's commission = 30% × 80,000 = **24,000 UGX** → stored as `commission_earned` (a one-time figure, not recurring)
9. Peter visits `/pipeline/referrals`:
   - Sees: "Sales Representative Commission"
   - Rate: 30% | Available to Claim: 24,000 UGX | Total Earned: 24,000 UGX
   - Message: "Contact the Custosell team to claim your pending commission"
10. Sarah visits `/platform/sales-reps`:
   - Sees Peter in the list: Code `SALES-M2X7N4`, Referee Discount 20%, 1 referral, 24,000 UGX pending, 0 UGX paid out
   - Total commission owed across all reps: 24,000 UGX

> **Rates are decoupled & safe-zone guarded:** the referee's discount (`discount_rate`) and the rep's commission
> (`commission_rate`) are independent dials, enforced so the company ALWAYS keeps the largest share
> (commission strictly between `d/(1−d)%` and 50%, discount ≤ 30%). Renewals and top-ups never
> re-trigger commission - the rep is paid once per signup, at activation.

### Sales Rep Creation - Email-Based Flow

**Key points:**
- Sales reps are **users with accounts** - they log into the Pipeline module to see their referral dashboard
- Creating a sales rep uses **email**, not a raw User ID
- Two modes:
  1. **Existing user** - admin enters email, system looks up the user, shows their name, admin selects commission → creates rep
  2. **New user** - admin enters email, system detects no user found, admin fills in name, system auto-creates the user account (random password - rep uses "Forgot Password") + sales rep + referral code in one step
- The user is **never duplicated** - if the email already belongs to a sales rep, the backend rejects with an error message

**Sales rep fields (all editable on create + update):**
- Contact: name, email, phone, region
- Payout method: mobile_money (provider, number, name) or bank (name, branch, account name, number)
- Commission: rate, type (percentage/flat), active status

**Backend:**
- `SalesRepRequest` accepts `email` (required on create) and `name` (used when creating new user, ignored for existing)
- `SalesRepService::create()` finds or creates the User, then creates the SalesRep + ReferralCode in a transaction
- On update (PUT), all fields except email/name are accepted - the user association is fixed

**Frontend:**
- Create modal has an email input with auto-search (600ms debounce) and a manual "Search" button
- If a user is found: green card with user info (name + email)
- If not found: amber card with "New user will be created" message
- Organized in PipelineFormSection cards: Contact Info, Payout Method, Commission
- Name field is editable for new users, pre-filled for found users
- Payout method toggles between Mobile Money fields and Bank fields

### Bulk Import

Sales reps can be imported in bulk from an Excel file, following the same pattern as product import.

**Backend:**
- `GET /sales-reps/import-template` → downloads `.xlsx` template with columns: Name*, Email*, Phone, Region, Discount Rate, Commission Rate*, Commission Type
- `POST /sales-reps/import` → accepts `.xlsx`, `.xls`, or `.csv` (max 20MB, 600s timeout)
- `SalesRepService::import()` processes rows in batch, validates per row, creates users+reps with auto-generated referral codes
- Returns `{ imported, errors[], total_rows }`

**Frontend:**
- "Import" button in the page header next to "Add Sales Rep"
- `SalesRepImportModal`: download template, select file, upload with progress bar, results display
- Follows the same pattern as product import (`ImportModal.tsx`)

### Installment Payout System

Instead of a boolean `commission_paid` flag, payouts are tracked individually via a `sales_rep_payouts` table, supporting partial/installment payments.

**Database:**
- `sales_rep_payouts`: `id`, `sales_rep_id` (FK), `amount`, `payment_method`, `notes`, `paid_at`, `paid_by` (FK→users)

**Calculation:**
- `paid_commission` = SUM of all `sales_rep_payouts.amount` for that rep
- `pending_commission` = SUM(`commission_earned` on referrals) - `paid_commission`
- This naturally supports any number of partial payments

**Backend endpoints:**
- `GET /sales-reps/{id}/payouts` → list payout history (with payer info)
- `POST /sales-reps/{id}/payouts` → record a new payout

**Frontend:**
- "Payouts" button on each sales rep row opens `SalesRepPayoutModal`
- Shows summary cards: Total Earned, Already Paid, Available to Pay
- Record form: amount, payment method, notes
- Payout history list with dates, methods, amounts

### Story 3: Flat Commission Rate (David)

**Characters:**
- **David** - Custosell partner with a flat commission deal
- **Platform Admin** - sets up David's agreement

**Scenario:**
1. Admin creates David as a Sales Rep with `commission_type = flat`, `commission_rate = 50,000`
2. David's code `SALES-F8G3D2` is auto-generated
3. A business signs up using David's code
4. On activation: David earns a flat **50,000 UGX** regardless of the plan price
5. David sees "Rate: 50,000 UGX" on his pipeline dashboard

### Story 4: Trying to Use Own Code (Blocked)

**Characters:**
- **Alice** - owns "Nile Tech Solutions", has referral code `V7R5Q2`

**Scenario:**
1. Alice tries to enter her own code `V7R5Q2` during her business's subscription
2. System blocks it: **"You cannot use your own referral code"**
3. Alice must use someone else's code or skip

### Story 5: Reusing a Code (Blocked)

**Characters:**
- **Bob** - referral code owner
- **Charlie** - owns "Mountain Coffee Exports"
- **Diana** - also at "Mountain Coffee Exports" (same business)

**Scenario:**
1. Charlie enters Bob's code → works, referral created
2. Charlie cancels the business, Diana re-registers the same business
3. Diana tries to enter Bob's code again → blocked: **"This business has already used this referral code"**
4. The check is by `referred_business_id` (business, not user)

### Story 6: Expired or Maxed-Out Code

**Characters:**
- **Frank** - has a campaign code with `max_uses = 5`, already used 5 times

**Scenario:**
1. A new business tries to enter Frank's code
2. `isValid()` returns false because `used_count >= max_uses`
3. Blocked: **"Referral code is invalid or expired"**

### Story 7: Platform Admin Manages Sales Reps and Payouts

**Characters:**
- **Sarah** - Platform admin

**Scenario:**
1. Sarah opens `/platform/sales-reps`
2. Sees a summary: 3 active reps, 150,000 UGX total commission owed, 75,000 UGX paid out
3. Sarah clicks "Edit" on a rep → can change commission rate, type, payout fields, or deactivate
4. Sarah clicks "Payouts" on a rep → sees payout history with dates, amounts, methods
5. Sarah records a partial payout of 50,000 UGX via Mobile Money → system updates pending balance to 100,000 UGX
6. Sarah imports 20 new reps in bulk via Excel download/upload

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
| `2026_07_25_000005_add_payout_fields_to_sales_reps_table` | Adds phone, region, payout method, MM/bank fields |
| `2026_07_25_000006_create_sales_rep_payouts_table` | Creates payouts table for installment tracking |
| `2026_08_10_000000_add_discount_rate_to_sales_reps_table` | Adds `discount_rate` (referee discount, decoupled from commission); migrates existing reps to 20/30 |

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
| GET | `/api/v1/sales-reps` | List all sales reps |
| PUT | `/api/v1/sales-reps/{id}` | Update sales rep fields |
| GET | `/api/v1/sales-reps/{id}` | Show single sales rep |
| GET | `/api/v1/sales-reps/earnings/all` | All sales reps with aggregated commission |
| GET | `/api/v1/sales-reps/earnings/mine` | Current sales rep's detailed earnings |
| GET | `/api/v1/sales-reps/{id}/earnings` | Single sales rep's earnings with referral & payout history |
| GET | `/api/v1/sales-reps/import-template` | Download bulk import Excel template |
| POST | `/api/v1/sales-reps/import` | Bulk import sales reps from Excel/CSV |
| GET | `/api/v1/sales-reps/{id}/payouts` | List payout history for a sales rep |
| POST | `/api/v1/sales-reps/{id}/payouts` | Record a payout (supports partial/installment) |

## Key Business Rules

1. **Self-use blocked** - a business cannot use its own owner's referral code
2. **One-time per business** - a business can only use a specific code once
3. **Code validity** - code must be active, not expired, under max_uses
4. **Commission triggers on activation** - only calculated when subscription transitions to ACTIVE (payment succeeds)
5. **Reward/commission calculated at creation** - uses the subscription's monthly price at the time of referral application
6. **Sales rep commission is separate from referrer reward** - the referrer gets a reward (e.g. free month), and the sales rep gets commission on top
7. **Installment payouts** - sales rep commissions can be paid in partial amounts; `pending_commission = total_earned - SUM(all payouts)` 

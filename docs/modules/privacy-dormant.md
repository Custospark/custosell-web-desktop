# Data Privacy Consent & Dormant Account Lifecycle

## Overview

Two features for data privacy compliance and account lifecycle management:

1. **Privacy consent at registration** — users must agree to the Data & Privacy Policy before creating an account.
2. **Dormant account flagging** — businesses inactive for 120+ days are flagged, owner is notified, and the business is marked for platform admin review.

---

## 1. Privacy Consent at Registration

### Frontend

**File:** `src/renderer/modules/auth/RegisterPage.tsx`

- Checkbox "I agree to the Data & Privacy Policy" before the Create Account button.
- **Default state:** checked (`privacyConsent = true`).
- Links to `/privacy` (opens in new tab with `ExternalLink` icon).
- On submit, `privacy_consent: true` is sent in the payload.

### Backend

**File:** `app/Http/Requests/BusinessRegisterRequest.php`

- Validation rule: `privacy_consent` => `['accepted']`
- Custom error: "You must agree to the Data & Privacy Policy to create an account."
- Applied to `/v1/businesses/register` endpoint.

### API Contract

- Request payload: `privacy_consent: true` (or `1`, `"yes"`, `"on"`)
- Response on failure: `422` with `errors.privacy_consent`

---

## 2. Dormant Account Flagging

No auto-deletion. Dormant businesses are flagged and logged for **platform admin** review.

### Schema

**Migration:** `2026_07_18_200000_add_dormant_cleanup_fields_to_businesses.php`

| Column | Type | Description |
|--------|------|-------------|
| `last_activity_at` | `timestamp, nullable` | Updated on owner login (`AuthController@login`) |
| `dormant_notified_at` | `timestamp, nullable` | Set when the dormancy notification is sent |

### Artisan Command

**File:** `app/Console/Commands/CleanDormantBusinesses.php`

**Signature:** `businesses:flag-dormant`

Logic:
1. Finds active businesses with `last_activity_at IS NULL OR last_activity_at < 120 days ago` AND `created_at < 120 days ago`.
2. For each dormant business:
   - If `dormant_notified_at` is **null**: sends `DormantAccountWarning` email to owner, sets `dormant_notified_at = now()`.
   - If `dormant_notified_at` is **older than 7 days**: logs `business.dormant_ready_for_deletion` to `PlatformAuditLog` — flags it for platform admin to review and action.

### Notification

**File:** `app/Notifications/DormantAccountWarning.php`

- Sent via email using `emails.standard` template
- Content: business flagged as dormant after 120 days, recommendation to log in or export data
- Subject: "Notice: Your Custosell Account Is Dormant"
- CTA: "Export My Data" link to settings/data-export

### Activity Tracking

**File:** `app/Http/Controllers/Api/AuthController.php`

- On login, `$user->business->last_activity_at` is set to `now()`, keeping the business active.

### Scheduling

**File:** `routes/console.php`

```
Schedule::command('businesses:flag-dormant')->dailyAt('03:00');
```

---

## 3. Deletion Audit Logging

### Self-Service Account Deletion (Owner)

**File:** `app/Http/Controllers/Api/BusinessAccountController.php`

- Logs `business.account_deleted` on self-destruction:
  - `actor_id`: the business owner
  - `target_type`: `'business'`
  - `metadata`: `business_name`, `business_slug`

### Dormant Ready-for-Deletion (System Flag)

**File:** `app/Console/Commands/CleanDormantBusinesses.php`

- Logs `business.dormant_ready_for_deletion` via `PlatformAuditService`:
  - `actor_id`: `null` (system)
  - `metadata`: includes `business_name`, `business_slug`, `dormant_notified_at`

### Pre-existing Audit Logs

- `business.data_reset` — `PlatformBusinessService::resetBusinessData()` (data wipe before deletion)
- `business.deleted` — `PlatformBusinessService::delete()` (platform admin action)

---

## 4. PrivacyPage Updates

**File:** `src/renderer/modules/landing/PrivacyPage.tsx`

- New section: **Account Dormancy & Cleanup** — explains 120-day flagging, periodic admin review, no deletion without warning
- Updated FAQ: "What happens to dormant accounts?" — explains the full lifecycle
- Updated Data Export section: mentions export reminder on dormancy
- Last updated: July 2026

---

## 5. Booking Time Slot Management (Pre-existing — Verified)

### Completed Booking Frees Slot

**File:** `app/Http/Controllers/Api/PipelineController.php` (`completeBooking`, line 2030)

- Sets `start_date = null` and `due_date = null` when a booking is completed.
- Slot generation (`PublicBookingController::slots()`) already excludes `booking_status IN ('rejected', 'completed')`.

### Booking Card Dates Auto-Set

**File:** `app/Http/Controllers/Api/PublicBookingController.php` (`book`, line 166-183)

- `start_date` and `due_date` both set to the selected appointment datetime at creation.

---

## Files Changed

### Frontend (3 files)
- `src/renderer/modules/auth/RegisterPage.tsx`
- `src/renderer/modules/landing/PrivacyPage.tsx`
- `src/renderer/shared/api/account/accountTypes.ts`

### Backend (7 files)
- `app/Http/Requests/BusinessRegisterRequest.php`
- `app/Http/Controllers/Api/BusinessAccountController.php`
- `app/Http/Controllers/Api/AuthController.php`
- `app/Models/Business.php`
- `app/Notifications/DormantAccountWarning.php` (new)
- `app/Console/Commands/CleanDormantBusinesses.php` (new)
- `database/migrations/2026_07_18_200000_add_dormant_cleanup_fields_to_businesses.php` (new)
- `routes/console.php`

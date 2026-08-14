# Platform Admin User Privileges & Server-Side Pagination

- **Date:** 2026-08-05
- **Status:** Accepted

## Context

Platform operators manage users from Platform › All Users. They needed the ability to grant and modify per-user (and per-linked-business) privileges without a dev or DB hand-editing: subscription plan, billing cycle, subscription status, onboarding-fee paid state, next billing date, account type, and (as a last line of defense) user email and password. At the same time, the Users and Businesses tables had grown past client-side filtering: all filtering and pagination needed to move server-side for scale and for server-only fields (`account_type`, `subscription_status`).

## Decision

### Backend (shipped in `4a96f6e` on custosell-core-api)

- New `PATCH /platform/users/{id}/privileges` and `POST /platform/users/bulk-privileges` routes under the `platform:platform.users.manage` middleware.
- `PlatformUserController::updatePrivileges` / `bulkUpdatePrivileges` call new `PlatformUserService::updatePrivileges` / `bulkUpdatePrivileges`, which:
  - update each field independently (only supplied fields are changed),
  - when no subscription exists, create one via `subscribe()` then immediately `activateAfterOnboarding()`,
  - set the password as plaintext (min 8 chars),
  - update `users.email` only (never `businesses.email`), lowercased/trimmed, uniqueness-checked against `LOWER(email)`,
  - audit every change under `user.privileges.fields` and `user.privileges.subscription`.
- Valid `subscription_status`: `trial|active|past_due|suspended|cancelled|expired`. Valid `account_type`: `business|personal|storefront_buyer`.
- `PlatformUserResource` now exposes `account_type`, `is_active`, and a `subscription` object (plan, cycle, status, onboarding-fee paid, next billing date).
- `PlatformUserService::paginateTenantUsers` eager-loads `business.subscription.plan`, supports `page`/`per_page`, `search` (name, email, phone, business name), and `account_type`/`is_active` filters; same for businesses with `status` + `subscription_status`.
- New `EnsureAccountUsable` middleware (alias `account.usable`): blocks deactivated users, restricted/suspended businesses; platform admins pass; adds `X-Account-Status` response header.

### Frontend (this change)

- New `PlatformUserPrivilegesModal` - single-user and bulk modes; plan (active plans only), billing cycle, subscription status, onboarding-fee paid, next billing date, account type, email, password; all fields optional; submit only enabled when a change is present. Remounts per target via a `key` that includes the first target id (no effect-based state reset).
- New `PlatformUserRowActions` dropdown - Notify / Change status / Platform role / Access & privileges / Delete - mirroring `PlatformBusinessRowActions`.
- New `PlatformUserFilters` component - search, login-activity, account-status (+duration), user-type, and account-type selects plus select-all and Assign-by-email. Extracted from the page to keep it ≤500 lines.
- **Modal standard:** all five All Users modals (Status, Notify, Delete, Role, Privileges) converted from bespoke `AnimatePresence` overlays to the shared `Modal` + `PipelineModalHero` + `PipelineFormSection`/`PipelineIconField` pattern used by the Product, Expense, Task/Lead, and business modals. Sticky footer, section cards, icon fields, and consistent tones. State resets via `key` remounts in a new `PlatformUserModals` composite (also keeps the page ≤500 lines).
- Users and Businesses pages now use server-side pagination (`page`/`per_page` params, meta from `current_page`/`last_page`/`total`), and filter-change handlers reset to page 1. Backend `/platform/users` and `/roles/{id}/members` return the same top-level raw-paginator shape as `/platform/businesses` (was `meta`-wrapped).
- New hooks `useUpdatePlatformUserPrivileges` and `useBulkUpdatePlatformUserPrivileges`; new endpoints `USER_PRIVILEGES` and `USERS_BULK_PRIVILEGES`.

## Update - Status-Aware Dates & Change Summary (2026-08-05)

- The privileges modal now shows the **date field that matches the chosen subscription status** instead of always "Next billing date": trial → trial ends, active → next billing, past due → grace period ends, suspended → suspended at, cancelled/expired → ends at. When no status is selected it falls back to the user's current status (see `resolveSubscriptionDateField`).
- New **"Changes to apply"** panel renders a before → after row for every field being changed (account type, email, plan, billing cycle, status, onboarding fee, status date). Password is shown as `•••••••• → Will be replaced` because the stored hash cannot be read back.
- Payload now accepts `trial_ends_at`, `grace_period_ends_at`, `suspended_at`, `ends_at` in addition to `next_billing_date`; `PlatformUser.subscription` exposes all lifecycle dates.
- New `utils/privilegeChangeSummary.ts` keeps the modal ≤500 lines.

## Consequences

- Platform admins can self-service subscription/privilege changes; no dev/DB access required for common corrections.
- Server pagination keeps Users/Businesses tables responsive as the user base grows and is required to filter on server-computed fields.
- Privilege edits are fully audited on the backend.
- Client-side filters that could not map to a server param (login activity, status duration) remain client-side over the current page - documented behavior.

## Related

- Backend ADR `2026-08-05-owner-business-seeder.md` - `PromoteOwnerBusinessSeeder` (admin for Oscar, update-or-create).
- `2026-08-01-product-listing-bulk-and-row-actions.md` - row-action dropdown pattern.

# Read-only email in Account Profile + personal shared-field sync to auth slice

**Date:** 2026-08-01

**Status:** Accepted

## Decision

1. **Email is read-only in Account > Profile** (`ProfileSettingsForm`), matching the existing read-only treatment in Business > Settings.
2. For **personal accounts only**, shared identity fields edited in Business > Settings (`name`, `phone`, `email`) are mirrored back into the user-level auth slice (`user.name`, `user.phone`, `user.email`) so the header, menus, and Account profile reflect the change immediately. Business accounts keep their separate `business.name`/`business.phone`/`business.email` and are **not** mirrored.

## Why

Email is the login identifier and is hard-locked on the backend (`UserService::validateEmailUpdate` throws `ValidationException` for owner email changes via staff settings). Showing it as editable in Account > Profile was misleading. Personal accounts treat the business profile fields as their own identity (same person), so edits there should update the logged-in user's name/phone/email. Business accounts have a distinct legal entity, so their business fields must stay separate.

## What changed

- `src/renderer/modules/settings/ui/ProfileSettingsForm.tsx` - email input is `readOnly` (`tabIndex={-1}`, muted styling, helper text "Email is your login and cannot be changed."). File also refactored under the 500-line Vera limit: `ProfileSectionCard` and the password section moved to `ProfileSectionCard.tsx` and `ProfilePasswordSection.tsx`.
- `src/renderer/modules/settings/ui/ProfilePasswordSection.tsx` - new component (password card extracted from the profile form).
- `src/renderer/modules/settings/ui/ProfileSectionCard.tsx` - new component (shared card shell extracted from the profile form).
- `src/renderer/modules/settings/api/settings/BusinessQueries.ts` - `useUpdateBusiness.onSuccess` now dispatches `setUser` with mirrored `name`/`phone`/`email` **only when the field actually changed** and **only for `account_type === 'personal'`**. The mirror compares submitted values against the pre-update business record, so a personal user editing only their phone won't have their `user.name` corrupted (the personal business name is `"{name}'s Workspace"` at signup and must never overwrite the real user name).

## Mirror rules (personal accounts)

| Field | Source (Business > Settings) | Target (auth slice) | Fires when |
|-------|------------------------------|---------------------|------------|
| name | `business.name` | `user.name` | name actually changed |
| phone | `business.phone` | `user.phone` | phone actually changed |
| email | `business.email` | `user.email` | email actually changed (normally stays read-only) |

Business accounts: no mirroring - `business.*` and `user.*` remain independent.

## Consequences

- Header / user menu (`UserProfileMenu`) shows the updated name/email right after a personal user saves Business > Settings.
- Account > Profile and Business > Settings agree on identity for personal accounts.
- Business accounts are untouched; entity name/contact fields never leak into the logged-in user's identity.

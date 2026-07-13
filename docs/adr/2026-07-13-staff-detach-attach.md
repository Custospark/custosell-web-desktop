# ADR: Staff Detach / Attach (membership vs account lifecycle)

**Date:** 2026-07-13  
**Status:** Accepted  
**Owners:** Mike (orchestration), Rex (FE/BE), Quill (docs)

## Context

Business owners previously soft-deleted or deactivated staff. Deactivate blocked login with “Your account has been deactivated,” which treated org removal as account lockdown. Soft-delete burned the email (unique constraint) and blocked re-hire. Owners must manage **organization membership**, not destroy logins. Platform deactivation (`is_active`) remains the only login lockout.

## Decision

1. **Detach** (`POST /users/{id}/detach`): clear `business_id`, `role_id`, `modules`; clear HR `user_id` for this business; revoke Sanctum tokens; **do not** soft-delete or set `is_active=false`.
2. **Attach** (`POST /users/attach`): link an unattached or soft-deleted free account by email; keep existing password; hard-block emails on another organization (409, no org name leaked).
3. **Lookup** (`GET /users/lookup?email=`): statuses `available` | `unattached` | `already_member` | `other_business` | `soft_deleted` | `platform_inactive`.
4. **Create** (`POST /users`) remains create-only for new emails. FE looks up first, then create or attach.
5. Staff `DELETE` and `is_active` updates from Settings are rejected. Platform user status APIs unchanged.
6. HR `remove-account` calls detach (not soft-delete). `unlink-user` still only clears the HR link. Create-account resolves create-or-attach (password optional when attaching).
7. One-shot migration restores soft-deleted non-owner staff as detached free accounts and reactivates wrongly deactivated org staff.
8. **`role_id` is optional** on HR create-account / attach and Settings attach. Staff can join the org without a role (“No role assigned”); modules still control launcher access.

## Consequences

- Detached users can still sign in → Discover / Account / Guide (null `business_id`).
- Same email can be re-attached after detach.
- Emails on another org require that org to detach first.
- Intentional platform deactivation still shows the deactivated login message.

## Failure states

| Case | Behavior |
|------|----------|
| Detach self / owner | 422 |
| Attach other-business email | 409 |
| Attach platform-inactive | 422 |
| Offline attach/detach/lookup | FE refuses with clear toast |
| Staff PUT `is_active` | Rejected / ignored |

## Key files

| Area | Path |
|------|------|
| Membership service | `Backend/app/Services/StaffMembershipService.php` |
| Routes | `Backend/routes/api/v1/users.php` |
| HR parity | `Backend/app/Services/Hr/HrEmployeeService.php` |
| Migration | `Backend/database/migrations/2026_07_13_140000_staff_detach_attach_membership_cleanup.php` |
| Staff UI | `Frontend/src/renderer/modules/settings/ui/StaffFormDrawer.tsx`, `StaffList.tsx` |
| HR UI | `Frontend/src/renderer/modules/hr/ui/HrEmployeeLoginSection.tsx` |
| Offline notes | `Frontend/docs/offline/settings.md` |

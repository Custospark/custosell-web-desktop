# Account Type ↔ Plan Guard on Privileges

- **Date:** 2026-08-05
- **Status:** Accepted

## Context

Platform admins grant plans from the Privileges modal. Choosing an account type and a plan inconsistent with it (e.g. a `personal` account given an `essential` business plan, or a `storefront_buyer` given any plan) produced contradictory account state and silent errors (hidden workspace/top bar). We needed one guard to prevent these combinations.

## Decision

Enforce a single rule across **both** stacks (`a6a6897` FE, `db83d13` BE):

- `storefront_buyer` accounts have **no subscription at all** — the subscription section is hidden in the UI and any subscription change is rejected by the API (422).
- When an account type is chosen, only plans whose `type` matches it are offered:
  - `business` → business plans (`essential`, `professional`, `enterprise`)
  - `personal` → personal plans
- The API rejects (`422`) a plan whose `type` does not match the supplied `account_type`.

### Frontend (`PlatformUserPrivilegesModal`)
- `filteredPlans` filters `activePlans` by the selected account type.
- Selecting `storefront_buyer` clears all subscription fields and hides the current-subscription info + the whole Subscription section.
- Switching account type clears any previously selected plan that no longer matches (done in `onChange`, no setState-in-effect).

### Backend (`PlatformUserController::validateAccountPlanPairing`)
- Shared guard called from both `updatePrivileges` and `bulkUpdatePrivileges`.
- Mirrors the UI so non-UI/API clients can't create contradictory subscriptions.

## Consequences

- One source of truth for the account-type/plan pairing rule on FE and BE.
- Guard tests moved to `tests/Feature/PlatformPrivilegeAccountTypeTest.php` to keep files ≤ 500 lines (Vera gate).
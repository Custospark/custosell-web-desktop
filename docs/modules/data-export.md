# Data & Export + Business Account Deletion

## Overview

Two features that work together:
- **Data & Export** (`/settings/data-export`): Export all business data in JSON, CSV, or XLSX
- **Account Deletion** (`/settings/business` Danger Zone): Permanently delete business with double confirmation

Both are owner-only, online-only operations.

## API

### Export

```
GET /api/v1/businesses/export?format=json
```

| Param | Values | Default |
|-------|--------|---------|
| `format` | `json`, `csv`, `xlsx` | `json` |
| `entity` | entity name or `all` | `all` (for csv/xlsx grouped summary) |

**Auth:** `auth:sanctum` + `business.active` + `module:settings`  
**Owner check:** Returns 403 if `request.user.id !== business.owner_id`

**JSON response shape:**
```json
{
  "data": {
    "exported_at": "2026-07-18T12:00:00Z",
    "business": { ... },
    "products": [ ... ],
    "customers": [ ... ],
    "sales": [ ... ],
    ...
  }
}
```

**Entities included:** Business, Products, Categories, Customers, Sales, Sale Items, Expenses, Expense Categories, Invoices, Invoice Items, Payments, Orders, Purchase Orders, Purchase Order Items, Stock Movements, Pipeline Boards, Leads, Estimates, Projects, Documents, Chart of Accounts, Journal Entries, General Ledger, Users, Roles, Shifts, Notifications

### Account Deletion

```
DELETE /api/v1/businesses/account
Body: { "password": "..." }
```

**Auth:** `auth:sanctum` + `business.active` + `module:settings`  
**Owner check:** Returns 403 if `request.user.id !== business.owner_id`  
**Password check:** Returns 422 if password doesn't match

**On success:**
1. `PlatformBusinessService::resetBusinessData()` — hard-deletes all transactional data
2. `$business->delete()` — soft-deletes business record
3. `$user->currentAccessToken()->delete()` — revokes session token

**Response:**
```json
{ "message": "...", "logged_out": true }
```

## Frontend

### DataExportPage (`modules/settings/DataExportPage.tsx`)
- Format selector (3 card buttons with check indicator)
- Confirm dialog before export triggers
- Automatic file download after success
- Owner-only warning banner
- "What's included" grid (20 entities)
- Online-only: button disabled when `isCompletelyOffline`

### BusinessSettingsPage Danger Zone
- Red card at bottom of business settings
- Two-step `Modal`:
  1. Warning with "I understand" checkbox
  2. Type `/reset {slug}` + password input
- On success: invalidate all queries, toast, `window.location.href = ROUTES.LOGIN`

### Sidebar
- "Data & Export" sub-item under Settings (icon: `Download`)
- Auto-picked by tour guide (via `navTourStepsForUser`) and mobile nav (via `resolveAccessibleNavLeaves`)

### Online-only
- Entry in `ONLINE_ONLY_NAV_ENTRIES` with message "Data export needs an internet connection"
- Nav items greyed out when offline, export button disabled with message

## Failure States

| Scenario | Behavior |
|----------|----------|
| Export while offline | Button disabled with message |
| Staff tries export | Backend returns 403; toast shows error |
| Wrong password on delete | Backend returns 422; inline error shown |
| Staff tries delete | Backend returns 403; toast shows error |
| Network error during export | Toast: "Failed to export data" |
| Network error during delete | Toast: backend error message |
| Delete succeeds | All queries invalidated → redirect to login |

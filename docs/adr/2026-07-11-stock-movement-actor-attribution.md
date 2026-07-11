# ADR: Stock movement actor attribution

**Date:** 2026-07-11  
**Status:** Accepted

## Context

Stock History (product ledger modal) showed “System / unknown user” because many `stock_movements` rows had `created_by = null`. Manual adjustments already set the actor via `StockMovementController`, but sales, refunds, and product imports did not. The API also returned an empty `created_by_user` wrapper when the relation was null.

## Decision

1. **Write paths always set `created_by`** to the authenticated actor:
   - Sales → cashier `userId`
   - Refunds → refunding user (`SaleController` passes `$request->user()->id`)
   - Manual adjustments / purchases → request user (controller + service fallback)
   - Product import initial stock → importing user
   - Sync import → payload `created_by`, else auth user
2. **Sale movements also store `sale_item_id`** for durable linkage.
3. **API** returns `created_by_user` only when `createdBy` is loaded and non-null.
4. **Backfill migration** attributes historical nulls via sale item / receipt notes, then business `owner_id`.
5. **Offline** local adjustments include `created_by_user` from the auth slice so the history UI shows the actor before sync.

## Consequences

- New movements show the logged-in user’s avatar + name in Stock History / Stock Ledger.
- Historical rows after migrate show cashier or owner rather than “System / unknown user”.
- Import-era “initial” rows without a known importer are attributed to the business owner (best available signal).

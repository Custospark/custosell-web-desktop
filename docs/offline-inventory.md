# Offline Inventory

Inventory offline support covers product and category creates, updates, and deletes through the shared mutation queue, plus **durable server catalog snapshots** for offline reads after logout.

## Server catalog snapshots (`serverCatalogs` store, DB v12)

When the app fetches lists from the server, it backs them up to IndexedDB keyed by `businessId`:

| Entity | Store key pattern | Notes |
|--------|-------------------|--------|
| Products | `products:{businessId}:full` or `:active` | Sales-only staff use `/products/active` |
| Categories | `categories:{businessId}:default` | |
| Customers | `customers:{businessId}:default` | |
| Roles | `roles:{businessId}:default` | Settings |
| Staff | `staff:{businessId}:default` | Settings |
| Sales (history) | `sales:{businessId}:list` | Full sales list from `GET /sales` |
| Sales (shift) | `sales:{businessId}:shift:{shiftId}` | My Shift / end-shift from `GET /sales/by-shift/:id` |
| Sales (daily) | `sales:{businessId}:daily:{YYYY-MM-DD}` | Dashboard daily; falls back to filtering `:list` |

### Read order (offline client path)

1. React Query in-memory cache (same session)
2. IndexedDB server catalog snapshot for the logged-in `business_id`
3. Pending local mutation overlay (`localProductsStore`, etc.)
4. Stock ledger quantity overlay (`stock` store)

Logout clears React Query but **keeps** IDB snapshots, so offline re-login still loads products and sales history.

Sales reads merge the IDB baseline with pending local sales (`localSalesStore`) and pending refunds (`localRefundsStore`), same as the online path.

### Write / refresh

- After successful server fetch → background `backupCatalogSnapshot`
- After online login → `refreshAllServerCatalogSnapshots`
- After sync tier completes → `refreshAllServerCatalogSnapshots`
- After online CRUD mutations → entity-specific snapshot refresh

## Product validation failures

Offline product creates are saved locally and queued as `POST /products` mutations. If the queued create later reaches the server and fails validation, the sync engine stores the server validation message on the local product record.

Failed product rows stay visible in the product list with a red `Sync failed` badge. The badge title and edit drawer show the saved validation message so the user can correct the product details.

## Correcting failed products

Editing a pending or failed product create does not create a duplicate local product or queue row.

- When the app is online, the corrected create payload is posted directly to `/products`.
- If that direct server correction succeeds, the local failed product row and its queued mutation are removed, and product queries are invalidated.
- If the direct correction cannot reach the server, the existing local product row and the original queued mutation payload are updated in place, the error is cleared, and the mutation is requeued.
- If the server rejects the corrected payload again, the validation error is shown to the user and the existing failed row remains available for another edit.

## Manual test: logout → offline login → products

1. Sign in online and open Inventory → Products (wait for list to load).
2. Log out.
3. Go offline (DevTools → Network → Offline).
4. Sign in with the same device credentials.
5. Open POS or Products — catalog should load from IndexedDB snapshot.

## Manual test: logout → offline login → sales history

1. Sign in online and open Sales History (and My Shift if clocked in) — wait for lists to load.
2. Log out.
3. Go offline (DevTools → Network → Offline).
4. Sign in with the same device credentials.
5. Open Sales History — prior server sales should appear from the `sales:{businessId}:list` snapshot.
6. Open My Shift — shift sales should appear from `sales:{businessId}:shift:{shiftId}` when that shift was snapshotted while online.
7. Offline sales created in-session still come from `localSalesStore` and merge on top of the baseline.

## Residual limitations

- Product failed-sync correction is scoped to queued creates. Pending updates and deletes still use the existing queued mutation behavior.
- Low-stock and stock-movement endpoints are not snapshotted; they require network.
- Sales snapshots refresh on login/sync for the full list and the **active** shift only; closed-shift history offline depends on prior online visits or the full list snapshot.
- Platform admin queries are never persisted.

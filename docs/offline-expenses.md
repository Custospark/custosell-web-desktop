# Offline Expenses

## Stores

- `localExpenseCategories` keeps pending expense category create, update, and delete records. It tracks `syncStatus` and `mutationId` so the sync engine can mark rows synced or failed.
- `localExpenses` keeps pending expense create, update, and delete records. It indexes `syncStatus`, `mutationId`, and `expenseCategoryId` so pending rows can be merged into expense lists and remapped after category sync.
- Expense queue payloads store structured fields plus optional receipt metadata. Raw `FormData` is not stored in IndexedDB.

## Expense Payloads

Expense mutations serialize multipart form data into:

```ts
{
  fields: Record<string, string>;
  receipt?: { blob: Blob; name: string; type: string; size: number; lastModified?: number };
}
```

During sync, the payload is rebuilt into `FormData`. Updates preserve the backend contract by posting to `/expenses/:id` with `_method=PUT`.

## Sync Order

1. Expense category creates sync before expense creates and updates.
2. When an offline category receives a server ID, pending local expenses and queued expense payloads are remapped from the negative local category ID to the server ID.
3. Expenses sync individually. They are not batched because receipts use multipart payloads.
4. Synced local expense/category rows are removed after the queue is cleared. Failed create/update rows stay pending for retry and continue showing sync badges; failed delete tombstones stay queued for retry but are not merged back into lists.

## Read Flow

Expense list, detail, category, and summary queries use the offline read strategy:

- Online or slow connections fetch from the API first and merge pending local rows.
- Completely offline reads use React Query cache plus IndexedDB pending rows.
- Network failures fall back to cached/offline data where possible.
- Pending delete records are excluded from expense and category list overlays, so deleted items remain hidden while their delete mutations retry.

## UI Indicators

- Pending expenses show a `Pending sync` badge.
- Pending receipt uploads show `Pending receipt` until the expense syncs.
- Pending expense categories show a `Pending sync` badge.
- Edit and delete actions are disabled for pending expense rows and pending category rows because mutation coalescing is not implemented.

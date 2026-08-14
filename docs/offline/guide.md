# Offline guide feedback

Guide module feedback can be submitted while completely offline. Submissions queue locally and sync when connectivity returns.

Related: [architecture.md](./architecture.md) · [testing.md](./testing.md)

## Stores

| Store | Path | Purpose |
|-------|------|---------|
| `localGuideFeedback` | `offline/guide/localGuideFeedbackStore.ts` | Pending feedback rows with sync metadata |

## Flow

1. User submits feedback on `GuideFeedbackPage` while offline.
2. `completeOfflineGuideFeedback.ts` builds a local row with negative `id` and `_pendingSync: true`.
3. Mutation enqueued (`POST` to guide feedback endpoint).
4. On reconnect, generic sync pipeline processes the mutation; synced rows are removed from IDB.

## Key modules

| Path | Role |
|------|------|
| `offline/guide/completeOfflineGuideFeedback.ts` | Offline completion + queue |
| `offline/guide/localGuideFeedbackStore.ts` | IDB CRUD |
| `modules/guide/api/GuideQueries.ts` | React Query hooks + offline read strategy |

## UI

- Pending submissions show **Pending sync** where applicable.
- No separate auth banner - uses standard offline/sync indicators ([../app/shell.md](../app/shell.md)).

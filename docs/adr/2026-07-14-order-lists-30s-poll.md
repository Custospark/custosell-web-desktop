# ADR: 30s auto-refresh for order lists

**Date:** 2026-07-14  
**Status:** Accepted  
**Scope:** Frontend (Purchase Orders, Incoming Orders, Sales Orders, Storefront My Orders)

## Context

Operators and buyers leave order list pages open while counterparts create or update orders elsewhere. Without refresh they miss status changes until a manual reload. Boards already poll every 30s; orders should match that near-live expectation without websockets.

## Decisions

1. **Poll only while the list page is open**  
   List hooks take `options?: { poll?: boolean }`. Pages pass `{ poll: true }`. Shared consumers (Marketplace open-PO badge, Discover strip count, POS open orders) stay on-demand - no background poll.

2. **Interval = 30_000 ms** (same as board kanban)  
   - `PURCHASE_ORDER_LIST_POLL_MS` - buyer PO + seller Incoming Orders  
   - `ORDER_LIST_POLL_MS` - Sales → Orders  
   - `STOREFRONT_ORDERS_POLL_MS` - Discover → My Orders  
   Uses React Query `refetchInterval` + `refetchIntervalInBackground: true` while the query is enabled/mounted.

3. **Backend unchanged**  
   Existing list GETs are sufficient; no new endpoints or websockets.

## Failure states

| Case | Behavior |
|------|----------|
| Offline / disabled query | `poll` gated by `enabled`; PO already uses `!isOffline` |
| Leave page | Query unmounts → interval stops |
| Request fails | React Query keeps prior data; next tick retries |
| Stale at most | ~30s between updates |

## Alternatives considered

- Always poll whenever any consumer mounts the hook - rejected (would hammer network from Marketplace / Discover chrome)
- Websockets - deferred (consistent with boards)

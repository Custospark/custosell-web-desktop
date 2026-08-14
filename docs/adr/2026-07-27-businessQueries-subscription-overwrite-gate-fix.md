# ADR: `useBusiness` subscription overwrite - gate redirect fix

**Date:** 2026-07-27
**Status:** Accepted
**Deciders:** Mike, Oscar
**Tags:** subscription, onboarding_fee_paid, setBusiness, useBusiness, gate, redirect

---

## Context

After an onboarding payment completed successfully:

1. `refetchProfile()` fetches `GET /auth/me` with updated subscription (`onboarding_fee_paid: true, status: trial`)
2. `setUser` merges the correct subscription into Redux
3. Layout auto-redirects to `/dashboard`
4. `useBusiness()` mounts with `refetchOnMount: 'always'` and `staleTime: 0`
5. The hook's `useEffect` calls `businessToAuthInfo(query.data)` which includes `subscription` from `GET /businesses/mine`
6. `dispatch(setBusiness(info))` overwrites the correct subscription with stale data from the business endpoint (`onboarding_fee_paid: false, status: past_due`)

This caused an infinite loop: pay → success → redirect → stale data → gate redirect → onboarding → pay again.

Timeline from debug logs:

```
[setUser] onboarding_fee_paid: true  | status: trial     ← correct from /auth/me
[Layout]  onboarding_fee_paid: true  | status: trial     ← Layout passes ✓
[REDUX]   action: auth/setBusiness   | prev OFP: true    → after OFP: false  ← REVERTED!
[Layout]  onboarding_fee_paid: false | status: past_due  ← redirect to /onboarding
```

## Decision

**1. Reverse subscription merge priority in `setBusiness` reducer (`authSlice.ts`)**

Before (bug):
```ts
subscription: incoming.subscription ?? state.user.business?.subscription
```
After (fix):
```ts
subscription: state.user.business?.subscription ?? incoming.subscription
```

The business endpoint `GET /businesses/mine` is never the source of truth for subscription data - only `GET /auth/me` (via `setUser`) is. This defense-in-depth prevents any future caller from accidentally overwriting subscription.

**2. Fix `useBusiness` effect (`BusinessQueries.ts`)**

Before:
```ts
if (existing?.subscription?.plan_features && !info.subscription?.plan_features) {
    info.subscription = existing.subscription;
}
dispatch(setBusiness(info));
```
After:
```ts
info.subscription = existing?.subscription ?? info.subscription;
dispatch(setBusiness(info));
```

Always preserve the existing subscription from `/auth/me`. The `plan_features` guard was insufficient - the incoming subscription could have `plan_features` but still be stale in other fields.

**3. Remove stale `useOnboardingState` re-fetch concerns**

The `useOnboardingState` query was ruled out as a culprit - its `queryFn` only returns onboarding state and does not dispatch `setUser` or `setBusiness`.

## Consequences

- No more gate-loop after successful onboarding payment
- Business data (name, email, phone, tax settings, etc.) still syncs correctly - only subscription is protected from overwrite
- Subscription updates from legitimate flows (plan upgrades, admin changes) flow through `setUser` from `/auth/me`, not `setBusiness`
- All existing `setBusiness` callers (sync engine, offline settings, business mutation callbacks) are now safe - they update business metadata without corrupting subscription state

## Related files

- `src/renderer/app/store/slices/authSlice.ts:248` - `setBusiness` reducer
- `src/renderer/modules/settings/api/settings/BusinessQueries.ts:112-113` - `useBusiness` effect
- `src/renderer/modules/settings/api/settings/businessAuthSync.ts` - `businessToAuthInfo` (unchanged, but now safe)
- `src/renderer/app/store/offline/sync/syncEngine.ts:346` - sync engine caller (now safe by reducer defense)
- `src/renderer/app/store/offline/settings/completeOfflineSettings.ts:385` - offline settings caller (now safe)
- `docs/adr/2026-07-25-subscription-persistence-businessQueries-overwrite.md` - prior ADR on related persist issue

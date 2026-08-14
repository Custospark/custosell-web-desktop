# Subscription Persistence - BusinessQueries `setBusiness` Overwrite

**Date:** 2026-07-25

## Status

Accepted

## Context

After login, the subscription (plan, features) data was present in Redux for ~10 seconds, then disappeared. The subscription drop caused `usePlanAccessibleModules` to hide all modules and `SubscriptionDropdown` to show "Choose a plan".

Debug tracing revealed:
- Login succeeded → `loginSuccess` stored user with `business.subscription.plan_features = true`
- After ~10 seconds, `GET /businesses/mine` would fire via `BusinessQueries.ts`
- A `useEffect` in `BusinessQueries.ts` dispatched `setBusiness(businessToAuthInfo(query.data))`
- `setBusiness` replaces `state.user.business` entirely with the new payload
- The `GET /businesses/mine` response omitted `subscription` entirely or lacked `plan_features`
- After the dispatch, `state.user.business.subscription` became `undefined`

Root cause chain:
1. `BusinessController::mine()` returned business without eager-loading `subscription.plan`
2. `BusinessResource` used `$this->whenLoaded('subscription')` - since subscription was not loaded, the field was omitted from the response
3. `businessToAuthInfo` spread the raw API response into a new `BusinessInfo` object missing `subscription`
4. `setBusiness` overwrote the good login data with this incomplete object

## Decision

Three changes, one on each layer:

### 1. Backend - `BusinessController::mine()`

Added `->loadMissing('subscription.plan')` before returning the `BusinessResource`. This ensures the subscription relationship (and its nested plan) are always loaded so `whenLoaded('subscription')` evaluates to truthy.

### 2. Backend - `BusinessResource`

Changed the bare `$this->whenLoaded('subscription')` to a closure that returns a mapped array:

```php
'subscription' => $this->whenLoaded('subscription', function () {
    return [
        ...$this->subscription->toArray(),
        'plan_name' => $this->subscription->plan?->name,
        'plan_slug' => $this->subscription->plan?->slug,
        'plan_features' => $this->subscription->plan?->features,
    ];
}),
```

This matches the shape that `UserResource` returns on login (`plan_name`, `plan_slug`, `plan_features`), making the business endpoint compatible with the frontend's `SubscriptionInfo` type.

### 3. Frontend - `BusinessQueries.ts` `useEffect`

Added a defensive guard: if the new business data from the API lacks `subscription.plan_features` but the existing Redux user has them, preserve the existing subscription object. This prevents regressions if any future endpoint also ships an incomplete subscription payload.

```typescript
useEffect(() => {
    if (!query.data) return;
    const info = businessToAuthInfo(query.data);
    const existing = store.getState().auth.user?.business;
    if (existing?.subscription?.plan_features && !info.subscription?.plan_features) {
      info.subscription = existing.subscription;
    }
    dispatch(setBusiness(info));
}, [query.data, dispatch]);
```

## Consequences

- Subscription data now persists after `GET /businesses/mine` completes
- The `BusinessResource` now returns `plan_name`, `plan_slug`, `plan_features` inside the subscription object, consistent with `UserResource`
- The frontend has a defense-in-depth guard against incomplete subscription payloads from any source
- `npx tsc --noEmit` and `npm run vera:fast` both pass

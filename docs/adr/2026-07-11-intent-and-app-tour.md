# ADR: Post-register intent + app-wide product tour

**Date:** 2026-07-11  
**Status:** Accepted (implemented)  
**Scope:** Frontend + Backend (auth/onboarding, shell tour)  
**Market:** International — compete as a full business OS, not a Uganda-only POS

## Context

Custosell grew from offline POS into sales, inventory, supply, pipeline, projects, documents, HR, accounting, and forecasting. New owners still land in a POS-shaped experience with no “why are you here?” step. Market peers use intent selection and guided tours to reduce overwhelm and improve activation.

## Decisions

1. **Intent screen (“What brings you to Custosell?”)**  
   - Shown after **business registration** and again on **login if incomplete**.  
   - **Owner-only** for v1 (account creator / business owner).  
   - Captures **primary + optional secondary** job-to-be-done intents.  
   - Copy is **international** (“run your business”), not Uganda-SME-only framing.  
   - **Never auto-enables or changes Module access.** Intent is preference / analytics / soft CTAs only.  
   - Owners grant modules in **Settings → Module access**; staff get modules from the owner.

2. **App-wide product tour**  
   - Shared `ProductTour` with `data-tour` anchors on shell controls.  
   - Covers **shell**: navbar, Apps launcher, Guide, sidebar — then hubs the user can already open.  
   - Tour **only spotlights accessible nav** (respects module access); card icons match Apps launcher.  
   - Steps without a live DOM target are filtered out; spotlight re-measures with retry.  
   - Resume if incomplete; **Skip** and **Replay tour** (navbar Tour button) required.  
   - **Skip and Finish** both open a ~30s flower celebration (dismissible).  
   - Staff may get a shorter shell tour; they do not get owner intent → module presets.

3. **Intent timing**  
   - After login/register, wait **5 seconds** once `needs_intent` is known before showing the intent modal so the shell can settle.

3. **Persistence**  
   - Business: `primary_intent`, `secondary_intent`, `intent_completed_at`, `intent_skipped_at`  
   - User: `tour_step`, `tour_completed_at`, `tour_skipped_at`  
   - API: `GET/PATCH /auth/onboarding`; payload also on `UserResource.onboarding`  
   - Existing tenants backfilled as skipped so they are not forced through on next login.

## Non-goals (v1)

- Auto-applying module presets from intent.  
- Staff “role intent” questionnaire.  
- Deep per-module tours beyond shell + first hub (can follow later).  
- Geography-specific welcome copy as the primary message.

## Implementation map

| Layer | Location |
|-------|----------|
| Migration | `2026_07_11_233000_add_onboarding_intent_and_tour_fields.php` |
| Service | `App\Services\OnboardingService` |
| API | `OnboardingController` |
| FE gate | `modules/onboarding/OnboardingGate.tsx` |
| Intent UI | `IntentOnboardingModal.tsx` |
| Tour | `ProductTour.tsx` + `productTourSteps.ts` |

## Failure states

| Case | Behavior |
|------|----------|
| Owner skips intent | Mark skipped; continue to tour |
| Owner skips tour | Mark skipped; flower celebration; Replay from navbar Tour |
| Tour finished | Flower celebration (~30s); Replay from navbar Tour |
| Incomplete mid-tour / logout | Resume at saved step on next login |
| Offline | Gate deferred (POS usable); resume when online |
| Staff login | No owner intent gate; tour if not completed/skipped |

## Related

- Product brief: [../product/intent-and-tour.md](../product/intent-and-tour.md)  
- Module access: Settings → Module access; `moduleAccess.ts`

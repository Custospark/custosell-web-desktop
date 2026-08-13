# Intent picker welcomes the user; tour is optional, never forced

- **Date:** 2026-08-13
- **Status:** Accepted
- **Stack:** Frontend (owner onboarding modal)

## Context

The post-registration intent modal opened with *"What brings you to Custosell?"* and a
mandatory goal selection (Continue was disabled until a primary goal was picked). That
felt investigative and intimidating right after signup. Skipping it ("Skip — take the
tour anyway") **forced** the product tour because `skip_intent` optimistically sets
`needs_tour = true` in `localStateForAction`.

## Decision

Rewrite `IntentOnboardingModal` to be welcoming and non-forcing:

- Header greets the user by first name: **"Welcome to Custosell, {name}!"** with warm,
  reassuring copy (works offline, nothing to set up).
- Goal picking is now **optional** ("Make it yours (optional)") — the intent data is a
  preference, never a gate.
- The bottom now asks **"Want a quick tour of Custosell?"** with two real choices:
  - **Take the tour** → saves the picked intent (or `skip_intent` if none), which leads to
    `needs_tour = true` and opens the tour via `OnboardingGate`.
- **No thanks** → sends a single **`dismiss_onboarding`** action (new FE+BE contract): it marks the
  intent as skipped (owner) *and* the tour as skipped in one update. Net state:
  `needs_intent = false`, `needs_tour = false` — the modal closes and nothing is forced.
- Because dismissal is persisted on the backend (`intent_skipped_at` + `tour_skipped_at`),
  onboarding never reappears automatically on later logins — `payloadFor()` reports
  `needs_intent = false` / `needs_tour = false` for that user.
- Users can still replay the tour anytime from the navbar (`replay_tour`), so declining
  never permanently hides it.

## Consequences

- No forced tour after signup; the user is invited, not interrogated.
- Intent is still captured (primary/secondary) when the user chooses to share it.
- `needs_tour` semantics unchanged on the backend; only the frontend flow around it changed.
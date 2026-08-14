# ADR: Auth shell mobile bottom tabs

**Date:** 2026-07-14  
**Status:** Accepted

## Context

Logged-in Custosell on small screens used a top hamburger plus an off-canvas sidebar. That is hard to reach with a thumb and crowds the top navbar. Marketing landing already ships a native bottom tab bar (`LandingMobileTabBar`). The product tour spotlights sidebar `data-tour` anchors and must keep working.

## Decision

1. **Mobile only (`lg` / 1024 breakpoint):** Auth shell shows an **in-flow** bottom tab bar (not a fixed overlay) - **Menu | first two accessible leaf routes | More**. Desktop layout (persistent sidebar + top hamburger collapse) is unchanged. Main content is never covered by the tab bar.
2. **Menu** replaces the top hamburger below `lg`. Business logo is `lg+` only in the navbar. Hamburger is `lg+` only.
3. **Pinned leaves** come from `resolveAccessibleNavLeaves` - the same module-access filter as `Sidebar` (catalog order, limited HR/estimates, owner-only settings).
4. **More** opens a bottom sheet: **Browse the app** (launcher with friendly copy - “any part of the app”, not “modules”) plus searchable quick links for remaining destinations.
5. **Tour:** Steps stay sidebar-targeted. `ProductTour.ensureSidebarForTarget` closes `mobileMoreOpen` before opening/measuring sidebar targets. Module steps still force-open the drawer.
6. **Chrome:** Footer is desktop-only (`lg+`). Top navbar tap targets stay enlarged on small screens.

## Consequences

- Limited-role users see different center pins (whatever their first two accessible leaves are).
- Favorites / user-customizable pins are out of scope (future).
- Related: [2026-07-13-module-access-and-landing-mobile-tabs.md](./2026-07-13-module-access-and-landing-mobile-tabs.md) (landing tabs pattern).

## Key files

- `src/renderer/shared/components/layout/AppMobileTabBar.tsx`
- `src/renderer/shared/components/layout/AppMobileMoreSheet.tsx`
- `src/renderer/shared/components/layout/resolveAccessibleNavLeaves.ts`
- `src/renderer/shared/components/layout/Layout.tsx` / `Navbar.tsx` / `Main.tsx` / `Footer.tsx`
- `src/renderer/app/contexts/AppContext.tsx` (`mobileMoreOpen`)
- `src/renderer/modules/onboarding/ProductTour.tsx`

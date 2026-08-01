# Header quick access + profile-centered apps/tour/tutorials + mobile distribution

**Date:** 2026-08-01

**Status:** Accepted

## Decision

1. **Apps, Tour, and Tutorials live under Profile.** The header no longer has the Apps launcher button or the Tour/Tutorials guide cluster. They moved into the account (Profile) dropdown — Apps opens the module launcher modal, Replay Tour and Tutorials are menu items. The header keeps Notifications, Referral, plan, sync, network, and Profile.
2. **Quick access in the header.** Users with sales access get an **Open Orders** shortcut with a live count badge (polls every 30s, same `ORDER_LIST_POLL_MS` as the orders page); users with inventory access get a **Products** shortcut.
3. **Mobile distribution.** Header items spread across the width (`justify-between`) so the left/right edges are no longer empty; the bottom tab bar fills the full width (removed `max-w-lg`).
4. **Tour updated** to match: removed the Apps/Guide cluster steps, added a Quick access step, and updated the profile step copy.

## Why

Oscar asked for Apps/Tour/Tutorials to be consolidated under Profile, businesses to get one-tap Open Orders (live count) and Products, better use of horizontal space on mobile header + bottom tabs, and a tour that reflects all of it.

## What changed

- `UserProfileMenu.tsx` — added "Apps" item that opens `ModuleLauncherModal` (menu div gated by `open`, modal survives menu close via `appsOpen`).
- New `HeaderQuickNav.tsx` — Open Orders (30s poll badge, gated on sales) + Products (gated on inventory).
- `useOrderQueries.ts` — `useOpenOrders(enabled, { poll })` now supports the poll option.
- `Navbar.tsx` — removed Apps launcher + GuideHeaderNav; added `HeaderQuickNav` + `HeaderNotifications`; mobile header uses `justify-between` (desktop unchanged: `lg:justify-end`).
- `GuideHeaderNav.tsx` → `HeaderNotifications.tsx` (notifications only). `ModuleLauncherButton.tsx` deleted (unused).
- `AppMobileTabBar.tsx` — bottom tabs span full width (`grid w-full`), dropping the `max-w-lg` cap.
- `productTourSteps.ts` — removed `apps`/`guide` steps, added `quick` step, updated `profile` copy.

## Consequences

- Header is decluttered; Profile is the home for Apps, learning, and account actions.
- Businesses see pending open orders at a glance and jump straight to them.
- Mobile header and bottom tabs use the full width instead of leaving dead space at the edges.
- Shopping/personal accounts without sales/inventory see no quick-access cluster (and the tour quick step is filtered out).

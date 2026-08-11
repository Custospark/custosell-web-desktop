# ADR — Responsive accounting views: chart of accounts + financial ratio tooltips

- **Date:** 2026-08-11
- **Status:** Accepted
- **Stack:** Frontend (React + Tailwind v4). No backend change.

## Context

The Chart of Accounts page and the Financial Ratios dashboard were desktop-first:

- **Chart of Accounts flat view** rendered a 6-column `Table` (the shared `Table` uses `min-w-full` + `whitespace-nowrap` inside `overflow-x-auto`), forcing horizontal scrolling on phones. The Tree view's fixed `ml-6` indentation per depth had no overflow guard. The header/action cluster and toolbar did not wrap.
- **RatiosPage (`RatioLine`) tooltip** was mouse-only (`onMouseEnter`/`onMouseLeave`), `position: fixed` with a fixed `w-[360px]`, only right-edge flipped, and never clamped to the viewport. On mobile it never appeared (no tap handler) and on small desktops it could render partially off-screen. The file was also 601 lines — over the 500-line hard limit.

## Decision

**Chart of Accounts (`ChartOfAccountsPage` + new components under `modules/accounting/ui/`):**
1. Flat view uses the existing card-on-mobile pattern: a `<div className="space-y-3 md:hidden">` mobile card list (new `ChartOfAccountMobileCard`) plus the desktop `Table` wrapped in `hidden md:block`. Pagination stays shared between both.
2. Tree view wrapped in `overflow-x-auto`; child indentation becomes `ml-3 sm:ml-6` and rows use `flex-wrap` so long names wrap instead of clipping.
3. Header/toolbar made wrap-safe: `flex flex-col gap-3 sm:flex-row`, `flex-wrap` on the action buttons, search/type filter go full-width on phones (`w-full sm:w-40`, `w-full sm:max-w-sm`).
4. Row actions (`AccountActions`: inline rename + delete confirm) and the status pill (`AccountStatusBadge`) extracted into shared components used by both the desktop table and mobile cards — one implementation, no duplication.

**Financial Ratios tooltip (`RatioLine`, extracted from `RatiosPage`):**
1. Opens on hover (desktop, unchanged) **and** on tap/click of the Info icon (mobile). Closes on outside tap, scroll, resize, or Escape.
2. Position is measured after render (`useLayoutEffect`) and clamped to the viewport on both axes; the panel width is responsive (`w-[min(360px,calc(100vw-1rem))]`), so it is never cut off on any screen.
3. `RatiosPage.tsx` refactored: `RATIO_DEFS`/`RATIO_INFO`/health-format helpers → `ui/ratioDefinitions.ts`, types → `ui/ratioTypes.ts`, `HealthDot` → `ui/HealthDot.tsx`, `RatioLine` → `ui/RatioLine.tsx`. The page drops from 601 → under 500 lines (file-size rule), with no behavior removed.

## Consequences

- Chart of Accounts is fully usable on phones: cards instead of cramped rows, scroll-safe tree, wrapping header.
- Ratio info is reachable and fully visible on touch devices and small viewports.
- `ChartOfAccountsPage` and `RatiosPage` are under the 500-line limit; new components are small single-purpose files.
- Backend pairing: COA auto-seeding on registration (Backend ADR `2026-08-11-chart-of-accounts-auto-seed.md`) means new accounts have data for these views immediately.

## References

- `src/renderer/modules/accounting/pages/ChartOfAccountsPage.tsx`
- `src/renderer/modules/accounting/ui/ChartOfAccountMobileCard.tsx`, `AccountActions.tsx`, `AccountStatusBadge.tsx`
- `src/renderer/modules/accounting/pages/RatiosPage.tsx`
- `src/renderer/modules/accounting/ui/RatioLine.tsx`, `ratioDefinitions.ts`, `ratioTypes.ts`, `HealthDot.tsx`

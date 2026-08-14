# ADR: Product list supply filter, responsive bulk bar, un-clipped row actions

**Date:** 2026-08-01
**Status:** Accepted

**Context:** After adding list/unlist bulk actions and a per-row Actions menu, three issues surfaced:
1. No way to filter the products table by supply listing status (`listed_for_supply`) - only public-shop status was filterable.
2. The bulk action options that appear when rows are selected (List shop, Unlist shop, List supply, Unlist supply, Delete) wrapped awkwardly and overflowed on narrow screens.
3. The per-row Actions dropdown (`absolute` inside the table) was clipped by the table's `overflow-x-auto` scroll container, so the menu items were cut off and unclickable - especially on mobile.

**Decision:**
- **Supply filter**: second `<select>` beside the shop filter - `All supply / Listed for supply / Not listed for supply` - applied in the same `filtered` memo (both filters combine; search still applies).
- **Supply badge**: name cell now shows a blue **Supply** badge alongside the existing green **Shop** badge, so listing state is visible at a glance and wraps cleanly on mobile.
- **Responsive bulk bar**: bulk action buttons and Delete become icon-only below `sm` (`<span className="hidden sm:inline">`), matching the header's Add/Upload/Download pattern; `title` tooltips retain the label.
- **Dropdown clipping fix**: `ProductRowActions` rebuilt on the `ExplorerRowMenu` pattern - the menu renders with `position: fixed` computed from the trigger button's `getBoundingClientRect()` (so it escapes the table's overflow container) plus a `fixed inset-0` backdrop that closes it on outside click. When the button is near the viewport bottom, the menu flips above the trigger (`useLayoutEffect` + `queueMicrotask` to satisfy `react-hooks/set-state-in-effect`); it also constrains to `max-h-[calc(100vh-1rem)]` with `overflow-y-auto` and `max-w-[calc(100vw-1rem)]`.

**Consequences:**
- Users can triage products by supply listing state and see both listing states inline.
- Bulk bar and table stay usable on phones without horizontal page overflow.
- Row action menus are always fully visible and clickable regardless of table scroll position.

**Files:**
- `src/renderer/modules/inventory/ui/products/ProductList.tsx`
- `src/renderer/modules/inventory/ui/products/ProductRowActions.tsx`

**Verification:** `npm run vera:fast` (eslint + logic) ✅ · `npx tsc --noEmit` ✅

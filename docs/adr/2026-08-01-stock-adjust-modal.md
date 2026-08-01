# ADR: Stock adjust drawer → standard modal

**Date:** 2026-08-01
**Status:** Accepted

**Context:** Adjust Stock opened as a right-hand `SlideDrawer`, inconsistent with the centered-modal pattern used across the product and category forms (`Modal` + `PipelineModalHero` + `PipelineFormSection`). A half-built `StockAdjustModal.tsx` also existed but was un-wired, hand-rolled (plain `fixed inset-0` overlay, no design-system components), and lost the reason-based stock movement types.

**Decision:**
- `StockAdjustDrawer` (deleted) replaced by `StockAdjustModal` using the standard design:
  - `Modal` (`size="md"`, title "Adjust Stock", subtitle = product name, close blocked while submitting).
  - `PipelineModalHero` (blue tone) showing product + current stock.
  - `PipelineFormSection` groups for **Direction** (Add/Remove segmented toggle), **Quantity** (icon field + current/after summary + "cannot go below zero" guard), and **Reason** (icon select with `pipelineSelectClass` + chevron).
  - Standard footer: `Button` Cancel (secondary) + submit (`loading`, `Check` icon, label reflects direction).
- Preserved the drawer's richer behavior: direction-specific reason lists map to real stock movement types (`purchase`/`return`/`adjustment`/`initial` for adds; `adjustment`/`return` for removes), plus `queueMicrotask` form reset to satisfy `react-hooks/set-state-in-effect`.
- `ProductList.tsx` now renders `StockAdjustModal`.

**Consequences:**
- Stock adjustment matches the product/category modal visual language (one less drawer in the app).
- Movement type semantics kept intact (the abandoned modal draft would have collapsed everything to `adjustment`).

**Files:**
- `src/renderer/modules/inventory/ui/products/StockAdjustModal.tsx` (rewritten)
- `src/renderer/modules/inventory/ui/products/StockAdjustDrawer.tsx` (deleted)
- `src/renderer/modules/inventory/ui/products/ProductList.tsx`

**Verification:** `npm run vera:fast` (eslint + logic) ✅ · `npx tsc --noEmit` ✅

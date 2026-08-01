# ADR: Inline "Add Category" in product modal; category drawer → modal

**Date:** 2026-08-01
**Status:** Accepted

**Context:** When creating a product, the category select only offered existing categories. If the category didn't exist yet, the user had to save the product, go to Categories, create it, and return. The category form also opened as a right-hand slide drawer, inconsistent with the centered modal pattern used across the product/pipeline forms.

**Decision:**
- `ProductFormModal` now shows an **Add Category** button on the Category label row that opens the category form in a centered modal.
- On create, the new category is **auto-selected** in the product form via an `onCreated` callback, so the user can keep filling the product without leaving the modal.
- The category form was rebuilt as `CategoryFormModal` using the standard modal design (`Modal` + `PipelineModalHero` + `PipelineFormSection`/`PipelineIconField`), replacing `CategoryFormDrawer` (deleted).
- `CategoryList` uses the same modal for create/edit.
- The nested modal stacks above the product modal (both portal to `document.body`; the later-rendered modal wins).

**Consequences:**
- Users can create a category mid-product-entry with no context switch; the select reflects it immediately (existing React Query category invalidation) and preselects it.
- Consistent centered-modal design for category and product forms; one less drawer in the app.
- `CategoryFormModal` mirrors the `queueMicrotask` form-reset pattern used by `ProductFormModal` to satisfy the `react-hooks/set-state-in-effect` lint rule.

**Files:**
- `src/renderer/modules/inventory/ui/categories/CategoryFormModal.tsx` (new)
- `src/renderer/modules/inventory/ui/categories/CategoryFormDrawer.tsx` (deleted)
- `src/renderer/modules/inventory/ui/categories/CategoryList.tsx`
- `src/renderer/modules/inventory/ui/products/ProductFormModal.tsx`

**Verification:** `npm run vera:fast` (eslint + logic) ✅ · `npx tsc --noEmit` ✅

# ADR: Branch stock transfer excludes service items

**Date:** 2026-08-02
**Status:** Accepted

**Context:** Branch-to-branch stock transfer treated catalog services as if they held physical stock. The `BranchTransferModal` listed every product (services included, each showing "Available: 0"), and the backend `StockMovementService::transfer()` deducted/incremented `location_product` quantities and wrote a `type = transfer` movement for service lines. This contradicted the earlier purchase-order receipt work (`d484fca`), which already skips stock movements for service lines because services are not quantitative. The result was branch stock being silently attributed to non-inventory services.

**Decision:** Services are never branch-transferable - modeled on the receive-path convention ("services are not quantitative, skip stock movements"):
- **Backend** `StockMovementService::transfer()`: after loading the product, `continue`s (skips) items where `!$product->tracksStock()` instead of validating/moving their stock, so no `location_product` rows and no transfer movement are created. This is a server-side guard that stays correct regardless of client.
- **Frontend** `BranchTransferModal.tsx`: filters service items out of the transferable list via the existing `isServiceItem()` helper (`ProductTypes.ts`), so staff can only pick physical products.

**Consequences:**
- Services can never appear in branch stock transfers or carry a branch balance.
- Transfer authorization (`valid`) and stock-availability checks only apply to trackable products.
- Matches the established receive-path rule, so semantics are consistent across receipt and transfer.

**Files:**
- `src/renderer/modules/inventory/ui/products/BranchTransferModal.tsx` (filter `stockProducts`)

**Verification:** `npm run vera:fast` (eslint + logic, incl. file-size) ✅ · `npx tsc --noEmit` ✅ · commit `32fd1d1`
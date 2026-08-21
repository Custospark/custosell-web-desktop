# ADR - Decimal quantity selectors (POS, storefront carts, invoices) & per-unit pricing

- **Date:** 2026-08-21
- **Status:** Accepted
- **Stack:** Frontend (backend counterpart: BE ADR `2026-08-21-decimal-quantities-unit-pricing.md`).

## Context

The backend now stores and validates decimal quantities and exposes `supports_decimal_quantity` / `pricing_unit_label` on every product (POS catalog, storefront catalog, invoices). The UI previously treated quantity as a whole number everywhere: integer steppers (`±1`), `parseInt` in the quantity modal and refund inputs, and raw `{quantity}` rendering on receipts.

## Decision

Make the quantity UX **unit-aware**: weight/volume products get a fractional quantity selector with preset chips and a live line-total preview; piece/custom products keep whole-number steppers.

1. **Cart model** (`sales/api/salesTypes.ts`, `salesSlice.ts`): `CartItem` gains `supports_decimal_quantity` (set from the product at add time); `updateQuantity` stores the value as-is (no truncation). Line math stays `unit_price × quantity` - already correct.
2. **Shared `QuantityEditModal`** (`sales/ui/QuantityEditModal.tsx`): when `supportsDecimalQuantity` is true it accepts `step=0.1`, `min=0.001`, shows **preset chips** (0.25 / 0.5 / 1 / 2 / 5 for decimals; 1 / 2 / 5 / 10 / 20 for pieces) and a **live line-total preview**; it uses `parseFloat` instead of `parseInt`. Reused by the POS cart, storefront bag, and invoice builder - one source of truth.
3. **POS steppers** (`SaleItemsStep.tsx`, `SaleCartTable.tsx`): `±` steps 0.5 for decimal-capable lines, 1 otherwise; quantity label shows the fractional unit (`0.5 Kg`).
4. **Storefront carts** (`StorefrontBagCheckout.tsx`, `storefrontTypes.ts`, `storefrontCartTypes.ts`): same modal, product-level decimal flag from the catalog, fractional totals via `bagTotal()` (already `unit_price × quantity`), decimal display.
5. **Invoices** (`InvoiceBuilderForm.tsx`, `InvoiceLineItemsTable.tsx`): line steppers + edit modal are decimal-aware using the product's `supports_decimal_quantity`; `lineNetTotal()` already multiplies correctly.
6. **Refund UX** (`RefundPanel.tsx`): quantity input uses `parseFloat` with a decimal step when the line is fractional; per-unit refund math divides by the true quantity (guarded against zero) instead of `max(1, qty)`.
7. **Display** (`shared/utils/formatQuantity.ts`): whole numbers render without decimals (legacy `2` stays `2`), fractional quantities keep up to 3 decimals (`0.5`, `1.25`); applied to receipts (printable + on-screen), cart steppers, refund lines, and storefront bags.
8. **Product form** (`ProductFormModal.tsx`): the "Unit of measure" field explains that the unit is the pricing basis (weight/volume → fractional checkout; pieces → whole numbers) using `PipelineIconField`'s built-in `hint` prop so it never overlaps the icon.
9. **Offline sync** (`completeOfflineProduct.ts`): the local product model carries `pricing_unit` so offline-created/edited products keep the flag.

## Why unit-agnostic

The product type is free-text. Rather than enumerate every possible unit, `supports_decimal_quantity` is derived from the machine-readable `pricing_unit` (backend) and defaults to `false` for anything unknown - so a `Roll` or `Sachet` product simply behaves as a whole-number item. No unit ever crashes or forces a fractional stepper.

## Consequences

- Checkout speed and accuracy improve for weight/volume sellers: one product, fractional quantities, auto-calculated price.
- Receipts/reports show `0.5 Kg`; refunds can restore fractional stock exactly.
- Storefront orders and invoices honour decimals, matching the POS.
- New frontend tests: `formatQuantity`, sales cart slice decimals, storefront bag decimals, invoice line decimals (all wired into `vitest.config.ts` include list).

## References

- `src/renderer/modules/sales/ui/QuantityEditModal.tsx`
- `src/renderer/modules/sales/ui/SaleItemsStep.tsx`, `ui/SaleCartTable.tsx`, `ui/refunds/RefundPanel.tsx`
- `src/renderer/modules/storefront/ui/StorefrontBagCheckout.tsx`
- `src/renderer/modules/invoices/InvoiceBuilderForm.tsx`, `InvoiceLineItemsTable.tsx`
- `src/renderer/shared/utils/formatQuantity.ts` (+ `__tests__/formatQuantity.test.ts`)
- `src/renderer/modules/sales/api/__tests__/salesSliceDecimal.test.ts`
- `src/renderer/modules/storefront/cart/__tests__/storefrontCartDecimals.test.ts`
- `src/renderer/modules/invoices/__tests__/invoiceLineDecimals.test.ts`
- `vitest.config.ts` (added the new `__tests__` folders to `include`)
- Backend ADR `2026-08-21-decimal-quantities-unit-pricing.md`
# ADR — Checkout Wizard: Split POS into Items → Customer & Payment steps

- **Date:** 2026-08-06
- **Status:** Accepted
- **Area:** Sales / POS UX

## Decision

Refactor the Point of Sale screen from a single long column (search + cart + customer/billing all stacked) into a clear **two-step checkout wizard**, driven by local component state in `NewSale.tsx`:

1. **Items** — search, add, and manage the cart.
2. **Customer & Payment** — customer details, payment method, installments, amount, discount, and Complete Sale.

No routing changes, no data-model changes, and all sale/order/invoice logic is preserved. The cart and sale state stay in the existing `salesSlice` (Redux), so switching steps never re-fetches or rebuilds the cart.

## Why

The previous layout stacked the search/cart and the customer/payment forms on one screen, causing a lot of vertical scrolling and a cramped 384px billing sidebar. Splitting into steps keeps each screen focused, reduces scroll, and gives a predictable cashier flow.

## What changed

- `NewSale.tsx` → thin orchestrator owning the `step` state, a header, a two-pill stepper (Items → Customer & Payment), a Back-to-Items affordance on step 2, and conditional rendering.
- New `ui/SaleItemsStep.tsx` → extracts Step 1 UI: animated search bar + results dropdown, cart table, Clear All, secondary action toolbar (Generate/Manage Invoice, Manage Orders, Update/Hold/Take Order), and the wizard's own modals (Held/Hold/Update/Quantity/Invoice). Includes a sticky bottom bar with item count and a `Continue to Payment` CTA that is disabled until the cart has items.
- `ui/BillingControls.tsx` → Step 2, split into two **equal-width** columns on `lg+` (`flex-1` each) that stack columnar on smaller screens: **left** = Customer, Payment Method, Pay-in-installments; **right** = Amount Tendered, Discount, Total (with Change Due / Paying now), and Complete Sale. No duplicated itemised cart list.
- After `Complete Sale`, the wizard auto-resets to Step 1 with a fresh cart (`onSaleCompleted` flips the step; `clearCart()` empties the cart).

## Responsiveness & file-size

- Layouts are `flex-col → lg/xl:flex-row` so tablets and phones stack cleanly; sticky bars are positioned per breakpoint.
- The step-1 UI exceeds 500 lines as a single component, so it was extracted into `SaleItemsStep.tsx` to observe the repo's `[file-size-500]` rule rather than growing `NewSale.tsx`.

## Out of scope

Always same-session UX improvement; no routing, API, sync, or persistence changes.
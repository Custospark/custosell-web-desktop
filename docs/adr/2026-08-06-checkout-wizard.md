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
- `ui/BillingControls.tsx` → Step 2, split into two **equal-width** columns on `lg+` (`flex-1` each) that stack columnar on smaller screens: **left** = Customer, Payment Method, Pay-in-installments; **right** = Amount Tendered, Discount, Total (with Change Due / Paying now), and Complete Sale. Sections are numbered (1–4) and the Total card / CTA use the shared gradient for a polished finish. No duplicated itemised cart list.
- `ui/CheckoutStepper.tsx` → shared gradient banner header: step-of-2 counter, tappable Back button, heading/subtitle per step, and a two-segment progress track. Replaces the earlier quiet pill header.
- After `Complete Sale`, the wizard auto-reset to Step 1 with a fresh cart (`onSaleCompleted` flips the step; `clearCart()` empties the cart); the modal stays visible until the cashier dismisses it.

## Responsiveness & file-size

- Layouts are `flex-col → lg/xl:flex-row` so tablets and phones stack cleanly; sticky bars are positioned per breakpoint.
- The step-1 UI exceeds 500 lines as a single component, so it was extracted into `SaleItemsStep.tsx` to observe the repo's `[file-size-500]` rule rather than growing `NewSale.tsx`.

## Out of scope

Always same-session UX improvement; no routing, API, sync, or persistence changes.

---

## Update (2026-08-06): Checkout UX polish pass

The wizard was refined into a standard, device-agnostic flow. Only frontend UI changed; the ADR's "Out of scope" still holds (no routing, API, sync, or persistence changes).

### Standard stepper, on-system header (revert of the gradient banner)

`CheckoutStepper.tsx` no longer uses a gradient banner/pills. The header is the on-system "Point of Sale" title + subtitle, and progress is a **standard numbered stepper** (Items → Payment) with circular markers — active = blue filled + `ring-4 ring-blue-100`, done = blue check, todo = outlined gray — and a connector line that fills blue when done. Title + stepper share one same-row group on desktop **and** mobile.

The Items marker is **clickable back** when on the payment step (`onBack` on the step), with a `focus-visible` ring for keyboard users.

### Dynamic step numbering on payment

`BillingControls.tsx` section numbers adapt to context via `showAmountEntry = installmentMode || paymentMethod === 'cash'`:

- **Cash or installments:** Customer (1) · Payment (2) · Amount (3) · Discount (4).
- **Card / Mobile / Other:** the "Amount received" entry is hidden, so **Discount renumbers to 3** — no dead number with no section.

### Decision-point Back + Complete, no duplicated amount

- **Desktop (lg+):** the right column holds `[← Back to Items (n)] [Complete Sale]` as a `hidden lg:flex` row — the two end-of-flow actions live together at the commitment point.
- **Mobile (<lg):** `StickyMobileSummary.tsx` is the single canonical control — **Total on its own full-width row above** a `Back to Items (n) | Complete Sale` pair, `sticky bottom-0`, thumb-reach. The in-form Total card is `hidden lg:block` and the in-column Back/Complete row is `hidden lg:flex`, so the amount and the actions are **never shown twice** on small screens.

### Keyboard fast-path + focus hygiene

- **Enter completes** the sale when valid and not already pending. Guarded: the global handler ignores Enter originating inside `input/textarea/select` (prevents accidental completion while typing a customer name/phone); the **Amount input keeps its own Enter fast-path** for cashiers.
- Payment method buttons carry explicit `title` + `aria-label` (e.g. *"Pay with another method (e.g. cheque, credit, voucher)"*).

### Cart sticky summary bar

`CartSummaryBar.tsx` (extracted when `SaleItemsStep` hit the 500-line cap) pins **"X items in cart" to the left edge and Total to the right edge** (`flex-1 justify-between`) with `Continue to Payment`, so the seller never scrolls the cart table horizontally for the subtotal.

### Open-order consistency

The "Take Order" button badge matches the header "Open Orders" badge: same `bg-red-500`, `99+` cap, and the badge count **polls on the same 30s cadence** as the header so both always agree. `HeldOrdersModal` was made responsive (search/sort row stacks, order cards collapse, actions sink below on small screens). "Other" payment is served by a clear title/aria-label.

### Responsiveness & file-size (refreshed)

Files introduced/stayed ≤ 500 lines by modularizing rather than reverting: `CheckoutStepper`, `BillingControls`, `SaleItemsStep`, `CartSummaryBar`, `StickyMobileSummary`.
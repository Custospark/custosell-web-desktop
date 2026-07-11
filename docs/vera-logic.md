# Vera Logic — repo rules & contracts

**Frontend:** `npm run vera:logic` (also inside `npm run vera:fast`)  
**Backend:** `composer vera:logic` (also inside `composer vera:fast`)

Static checks that lint/syntax alone cannot express. Fail the handoff if any rule fails.

Changed-file collection includes **untracked new files** (`git ls-files --others`) so brand-new modules are checked before commit.

## Frontend rules (`scripts/vera-logic.mjs`)

| ID | What it enforces |
|----|------------------|
| `file-size-500` | Changed `src/**/*.ts(x)` files must be ≤ 500 lines |
| `relative-imports` | Relative `from './…'` / `import('./…')` paths resolve on disk (catches Vite import-analysis breaks) |
| `supplier-invoices-route` | `/invoices/supplier` exists and mounts `InvoicesPage mode="supplier"` |
| `sidebar-invoice-labels` | Sidebar has **Sales invoices** and **Supplier invoices** |
| `buyer-record-payment-gate` | `RecordPaymentModal` gates `canRecord` via received / viewOnly |
| `no-buyer-focus-payments` | Buyer PO surfaces do not deep-link `focus=payments` |
| `view-invoice-modal` | `ViewInvoiceModal.tsx` exists |

## Backend rules (`scripts/vera-logic.php`)

| ID | What it enforces |
|----|------------------|
| `file-size-500` | Changed `app/**` / `tests/**` PHP ≤ 500 lines |
| `php-imports` | `use App\…` / `use Tests\…` map to existing PSR-4 files |
| `owner-only-payments` | `InvoiceService::canManagePayments` uses `isOwnedByBusiness` |
| `buyer-ap-automation` | `SupplierInvoiceAccountingService` wired on send + payment listeners |
| `buyer-ap-accounts` | Buyer AP path references AP + inventory |
| `buyer-ap-feature-test` | SupplyChainTest covers dual-book AR/AP posting |

## Extending

- FE: add a rule function in `scripts/vera-logic.mjs` and append to `results`.
- BE: add a `veraLogic*` function in `scripts/vera-logic.php` and merge into `$results`.
- Prefer contracts that protect accounting / invoice ownership / offline-first mistakes over style nits.

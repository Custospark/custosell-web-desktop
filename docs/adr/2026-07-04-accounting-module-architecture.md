# ADR-2026-07-04: Accounting Module Architecture

**Status:** Approved

**Date:** 2026-07-04

**Authors:** Custospark Product Development Team

## Context

Custosell is a POS platform for Ugandan retail businesses. As the product matures, businesses increasingly need:

1. **URA compliance** — the Uganda Revenue Authority requires registered businesses to maintain proper books of accounts and file tax returns with auditable financial data.
2. **Financial reporting** — business owners need income statements, balance sheets, and trial balances to understand profitability, manage cash flow, and secure loans.
3. **Professional credibility** — businesses want to move from receipt-scanning bookkeeping to GAAP-compliant accounting, comparable to QuickBooks or Sage.

The existing POS system records sales and expenses as transactional data but has no accounting engine. There is no chart of accounts, no double-entry journal, no period concept, and no way to produce financial statements.

## Decision

We will build a **full double-entry accounting system** as a native module within Custosell, spanning:

- **Backend (Laravel):** Controllers, Services, Models, Migrations, Seeders, and Feature Tests for Chart of Accounts, Journal Entries, General Ledger, Trial Balance, Income Statement, Balance Sheet, Financial Ratios, Fixed Assets (straight-line depreciation), and Period Closing.
- **Frontend (React):** 9 page components, 2 API layer files (types + React Query hooks), route registration, sidebar navigation, and module access control.
- **Integration:** Auto-accounting service that generates journal entries from Sales and Expense events.

Key architectural constraints:
- **Immutable journal entries** — posted entries are locked. Corrections require reversing entries.
- **Strict period closing** — closed periods reject new entries. Reopening is admin-only and audited.
- **Start from activation** — no retroactive conversion of pre-activation transactions.
- **Single currency** — business currency from settings.
- **URA-compliant default COA template** — seeded on business registration.

## Consequences

### Positive
- URA-compliant financial reports available on demand.
- Full audit trail — every entry is traceable, immutable, and reversible.
- Professional financial statements (income statement, balance sheet) for stakeholders.
- Auto-accounting removes manual double-entry for POS transactions.
- Financial ratio analysis for business health monitoring.
- Straight-line depreciation for fixed asset management.

### Negative
- Immutable entries require a reversing workflow for corrections, adding operational steps.
- Period closing adds operational complexity — businesses must close periods regularly.
- No multi-currency support — businesses trading in multiple currencies cannot use the module for FX transactions.
- No retroactive conversion — businesses with months of pre-activation sales cannot generate historical financial statements.
- Offline posting is limited — the immutability constraint requires server confirmation for the post action.

## Alternatives Considered

### Third-Party Integration (QuickBooks / Sage / Wave)

**Rejected.** Custosell's offline-first requirement means the accounting system must work without internet connectivity. Third-party APIs are not available offline. Additionally, per-seat licensing costs would increase the product price significantly, and data would leave the Custosell ecosystem.

### Single-Entry Bookkeeping (Receipt-Scanning Model)

**Rejected.** Single-entry bookkeeping is not GAAP-compliant and does not satisfy URA audit requirements. Ugandan tax law requires registered businesses to maintain proper double-entry books. Single-entry would also prevent production of balance sheets and accurate trial balances.

### Simplified Cash-Basis Accounting

**Considered but deferred.** Cash-basis (recording only when cash changes hands) would simplify the system but would not support accounts receivable, accounts payable, prepayments, accruals, or fixed asset depreciation. These are requirements for businesses seeking loans or formal financial reporting. Accrual-basis double-entry was chosen from the start.

### Incremental Rollout (COA First, Statements Later)

**Deferred.** While building incrementally was discussed (launch COA, then entries, then statements), the integrated dependency graph (statements depend on GL, GL depends on entries, entries depend on COA and periods) means partial rollout offers no user value. The module is launched as a complete vertical slice.

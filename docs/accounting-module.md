# Accounting Module — Implementation Summary

Full double-entry accounting system built for UGA/URA compliance, audit trail integrity, and professional financial reporting. Covers Chart of Accounts, Journal Entries, General Ledger, Trial Balance, Financial Statements, Ratios, Fixed Assets, and Period Closing — with auto-accounting from Sales, Expenses, and **HR Payroll**.

## Implementation Summary

The accounting module introduces a complete double-entry bookkeeping backbone to Custosell. Every POS sale, expense, payroll post/settlement/remittance, and manual adjustment generates balanced journal entries posted to a GAAP-structured chart of accounts. The system provides real-time financial reports, ratio analysis, fixed asset management with straight-line depreciation, and strict period closing to prevent retroactive edits.

**Why build not buy:** Offline-first requirement rules out QuickBooks/Sage integration. Single-entry bookkeeping (receipt-scanning approach) is not GAAP-compliant and would not satisfy URA audit requirements.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Start fresh from activation** | No retroactive conversion from pre-accounting data. Accounting begins when the business activates the module. Historical POS transactions before activation are not converted. |
| **Auto-generate entries from POS events** | Sales and expenses automatically create journal entries via `AutomationService`. This ensures no transaction is missed and maintains data integrity. |
| **Product vs service revenue** | Catalog `type` splits sale/invoice revenue: products → 4100 (`sales_revenue`), services → 4200 (`service_revenue`). Services skip stock and COGS. See [ADR: product vs service](./adr/2026-07-10-product-vs-service-sales.md). |
| **HR payroll journals** | Pay-run Post / Settle / Remit / Void create or reverse journals (`hr_pay_run*`). Liabilities use 2110–2112. See [ADR: payroll accounting bridge](./adr/2026-07-10-hr-payroll-accounting-bridge.md). |
| **Straight-line depreciation only** | Simplest method, most predictable, URA-accepted. Accelerated/mileage methods can be added later. |
| **Single currency per business** | Business settings define the functional currency. No multi-currency support in v1. FX features deferred. |
| **Strict period closing** | Closed periods reject new/pending entries. Reopening requires explicit action and logs the event. Prevents accidental post-dating. |
| **Default URA-compliant COA template** | New businesses get a pre-seeded chart of accounts matching Ugandan tax authority classification. Customizable after activation. |
| **Immutable journal entries** | Posted entries are locked. No edit, no delete. Corrections use reversing entries, preserving full audit trail. |

## Files Created

### Frontend — Pages (9 files)
| File | Purpose |
|------|---------|
| `src/renderer/modules/accounting/pages/ChartOfAccountsPage.tsx` | COA flat/tree view, add account form |
| `src/renderer/modules/accounting/pages/JournalEntriesPage.tsx` | Entry list, multi-line entry editor with balance validation |
| `src/renderer/modules/accounting/pages/TrialBalancePage.tsx` | Trial balance report with period filter |
| `src/renderer/modules/accounting/pages/IncomeStatementPage.tsx` | P&L statement with section drill-down |
| `src/renderer/modules/accounting/pages/BalanceSheetPage.tsx` | Balance sheet with assets = liabilities + equity check |
| `src/renderer/modules/accounting/pages/RatiosPage.tsx` | Financial ratio dashboard (liquidity, solvency, efficiency, profitability) |
| `src/renderer/modules/accounting/pages/AccountingPeriodsPage.tsx` | Period CRUD, close/reopen actions |
| `src/renderer/modules/accounting/pages/FixedAssetsPage.tsx` | Asset list, register, depreciation run, schedule viewer |
| `src/renderer/modules/accounting/pages/AccountingSettingsPage.tsx` | Module settings |

### Frontend — API Layer (2 files)
| File | Purpose |
|------|---------|
| `src/renderer/modules/accounting/api/AccountingTypes.ts` | All TypeScript interfaces (COA, periods, entries, statements, ratios, assets) |
| `src/renderer/modules/accounting/api/AccountingQueries.ts` | React Query hooks — 10 queries + 6 mutations |

### Backend — Controllers (6 files)
| File | Purpose |
|------|---------|
| `app/Http/Controllers/Api/V1/Accounting/ChartOfAccountController.php` | COA CRUD + tree endpoint |
| `app/Http/Controllers/Api/V1/Accounting/AccountingPeriodController.php` | Period CRUD + close/reopen |
| `app/Http/Controllers/Api/V1/Accounting/JournalEntryController.php` | Entry CRUD + post + reverse |
| `app/Http/Controllers/Api/V1/Accounting/GeneralLedgerController.php` | Trial balance, income statement, balance sheet |
| `app/Http/Controllers/Api/V1/Accounting/RatioController.php` | Financial ratio calculations |
| `app/Http/Controllers/Api/V1/Accounting/FixedAssetController.php` | Asset CRUD + depreciation |

### Backend — Services (7 files)
| File | Purpose |
|------|---------|
| `app/Services/Accounting/ChartOfAccountService.php` | Business logic for COA management |
| `app/Services/Accounting/AccountingPeriodService.php` | Period lifecycle, validation |
| `app/Services/Accounting/JournalEntryService.php` | Entry creation, posting, reversing |
| `app/Services/Accounting/GeneralLedgerService.php` | Ledger queries, statement generation |
| `app/Services/Accounting/RatioService.php` | Ratio calculations |
| `app/Services/Accounting/FixedAssetService.php` | Asset management, depreciation engine |
| `app/Services/Accounting/AutoAccountingService.php` | Auto-generate entries from POS events |

### Backend — Models (6 files)
| File | Purpose |
|------|---------|
| `app/Models/AccountingPeriod.php` | Period model with `is_closed` scope |
| `app/Models/AccountType.php` | Account type reference data |
| `app/Models/ChartOfAccount.php` | Account model with parent/children relationship |
| `app/Models/JournalEntry.php` | Entry with lines relationship |
| `app/Models/JournalEntryLine.php` | Entry line with account relationship |
| `app/Models/FixedAsset.php` | Asset with depreciation entries |
| `app/Models/DepreciationEntry.php` | Depreciation run record |

### Backend — Database (8 migrations + 2 seeders)
| File | Purpose |
|------|---------|
| `database/migrations/*_create_account_types_table.php` | Account types reference |
| `database/migrations/*_create_chart_of_accounts_table.php` | COA with self-referential parent |
| `database/migrations/*_create_accounting_periods_table.php` | Periods with close tracking |
| `database/migrations/*_create_journal_entries_table.php` | Entries with reference tracking |
| `database/migrations/*_create_journal_entry_lines_table.php` | Entry lines with debit/credit |
| `database/migrations/*_create_fixed_assets_table.php` | Fixed assets |
| `database/migrations/*_create_depreciation_entries_table.php` | Depreciation run history |
| `database/seeders/AccountingSeeder.php` | URA-compliant default COA template |
| `database/seeders/AccountingPeriodSeeder.php` | Initial period creation |

### Tests
| File | Purpose |
|------|---------|
| `tests/Feature/Accounting/ChartOfAccountTest.php` | COA CRUD + tree + template seeding |
| `tests/Feature/Accounting/JournalEntryTest.php` | Create, post, reverse, balance validation |
| `tests/Feature/Accounting/AccountingPeriodTest.php` | Period CRUD, close/reopen, guard |
| `tests/Feature/Accounting/GeneralLedgerTest.php` | Trial balance, P&L, balance sheet |
| `tests/Feature/Accounting/RatioTest.php` | Ratio calculations |
| `tests/Feature/Accounting/FixedAssetTest.php` | Asset CRUD, depreciation schedule |
| `tests/Feature/Accounting/AutoAccountingTest.php` | Auto-generation from sales/expenses |

## Files Modified

| File | Change |
|------|--------|
| `Frontend: src/renderer/app/routes/index.tsx` | Added accounting route group with `ModuleAccessMiddleware` gate |
| `Frontend: src/renderer/app/routes/constants/shared.paths.ts` | Added `ROUTES.ACCOUNTING` with 9 paths |
| `Frontend: src/renderer/shared/components/layout/Sidebar.tsx` | Added 9 accounting navigation items |
| `Frontend: src/renderer/shared/utils/moduleAccess.ts` | Registered `'accounting'` module for access control |
| `Backend: routes/api.php` | Registered accounting API route group under `/api/v1/` |
| `Backend: app/Providers/AppServiceProvider.php` | Registered accounting services |

## Integration Points

### Event System
`AutoAccountingService` listens to `SaleCompleted` and `ExpenseRecorded` events to auto-generate journal entries. These entries are created as **drafts** and automatically **posted** — no manual intervention needed for basic POS transactions.

### Sync / Offline
Accounting operates primarily online due to the immutability constraint. Draft entries can be created offline and synced, but posting (the lock step) requires server confirmation. The mutation queue handles deferred posting.

### Auth & Permissions
- Accounting routes are gated by `ModuleAccessMiddleware` with the `'accounting'` module key.
- Close Period and Run Depreciation require `admin` or `accountant` role.
- Journal entry creation is available to `admin`, `accountant`, and `manager` roles.

### Auto-Generated Reference Types
| POS Event | Reference Type | COA Impact |
|-----------|---------------|------------|
| Sale (cash) | `sale` | Debit Cash, Credit Revenue |
| Sale (credit) | `sale` | Debit Accounts Receivable, Credit Revenue |
| Expense | `expense` | Debit Expense account, Credit Cash |
| Refund | `refund` | Reverse of original sale entry |
| Depreciation | `depreciation` | Debit Depreciation Expense, Credit Accumulated Depreciation |

## Testing

### Backend Tests (Feature Tests)
```bash
php artisan test tests/Feature/Accounting/
```

Covers:
- COA: CRUD, tree structure, template seeding, duplicate code prevention
- Journal Entries: balanced enforcement, post locks, reversing, reference linking
- Periods: CRUD, close guard (rejects new entries), reopen audit log
- General Ledger: trial balance balancing, P&L calculations, balance sheet equation
- Ratios: correct formula math, null-safe division for missing data
- Fixed Assets: CRUD, straight-line calculation, monthly schedule, fully-depreciated status
- Auto-Accounting: event listener wiring, correct account selection, amount accuracy

### Frontend Verification
```bash
npm run vera:fast       # ESLint + type checks
npx tsc --noEmit        # Full type surface check
```

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Unbalanced entries** | High | Server-side balance validation on create. Frontend real-time balance indicator. API rejects unbalanced payloads. |
| **Duplicate auto-entries** | Medium | Event idempotency key on Sale/Expense IDs. AutoAccountingService checks reference before creating. |
| **Stale cache after period close** | Low | React Query invalidation on period close mutation. Period list refetches automatically. |
| **Depreciation rounding errors** | Low | Monetary amounts stored as integers (cents). Depreciation uses ceiling on final period to absorb remainder. |
| **Reopening closed period** | High | Reopen is `admin`-only, logged, and cascades to re-enable draft creation. Existing posted entries remain immutable. |
| **Accidental COA deactivation** | Medium | Accounts with journal entry history cannot be deleted — only deactivated (`is_active = false`). |
| **Sync conflicts on posted entries** | High | Posted entries are server-authoritative. Offline draft entries that reference closed periods are rejected on sync. |
| **Missing COA template for new businesses** | Low | `AccountingSeeder` runs on business registration hook. Default template always available. |

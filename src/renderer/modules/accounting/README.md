# Accounting Module

Full double-entry accounting system for Custosell - Chart of Accounts, Journal Entries, General Ledger, Trial Balance, Financial Statements, Ratios, Fixed Assets (straight-line depreciation), and Period Closing.

## Architecture

```
Sales / Expenses ──→ Auto-Journal Entry ──→ General Ledger ──→ Trial Balance ──→ Financial Statements
                           ↑                                                    ↓
                    Manual Journal Entry                                    Ratios
                           ↑
                    Fixed Asset Depreciation
```

### Backend Services (Laravel)
- `ChartOfAccountService` - COA CRUD, tree, template seeding
- `AccountingPeriodService` - period lifecycle, closing/reopening
- `JournalEntryService` - immutable entry creation, posting, reversing
- `GeneralLedgerService` - trial balance, income statement, balance sheet
- `RatioService` - financial ratio calculations
- `FixedAssetService` - asset CRUD, straight-line depreciation engine
- `AutoAccountingService` - auto-generates journal entries from Sales and Expense events

### Frontend Pages (React)
Every page is a self-contained module under `pages/`, backed by React Query hooks in `api/`.

### Data Flow
```
Component (.tsx) → useQuery/useMutation hook (AccountingQueries.ts) → axiosInstance → /api/v1/...
```

## Key Concepts

### Double-Entry Accounting
Every transaction has equal debits and credits. The system enforces balance at entry creation time.

### Chart of Accounts (COA)
Hierarchical account list with 5 base types: Asset, Liability, Equity, Revenue, Expense. Each account has a code, name, type, and normal balance (debit/credit). New businesses receive a URA-compliant default template.

### Journal Entries
Immutable records of financial transactions. Each entry:
- Has a unique entry number (auto-generated)
- Belongs to an accounting period
- Has at least 2 lines with balanced debits/credits
- Can be **Draft** or **Posted** (once posted, lines are locked)
- Corrections use **reversing entries** (never edit a posted entry)

### Accounting Periods
Monthly or custom date ranges. Periods can be **closed** (no new entries allowed in that period). Strict period closing prevents edits to closed periods.

### Immutability
Posted journal entries are **append-only**. Corrections require a reversing entry, creating a clear audit trail.

## File Structure

### Frontend (`src/renderer/modules/accounting/`)
```
api/
  AccountingTypes.ts        - TypeScript interfaces for all entities
  AccountingQueries.ts      - React Query hooks (queries + mutations)
pages/
  ChartOfAccountsPage.tsx   - COA list/tree view, add account form
  JournalEntriesPage.tsx    - Journal entry list, new entry form with line editor
  TrialBalancePage.tsx      - Trial balance report by period
  IncomeStatementPage.tsx   - Profit & loss report with section drill-down
  BalanceSheetPage.tsx      - Balance sheet report with sections
  RatiosPage.tsx            - Financial ratio dashboard
  AccountingPeriodsPage.tsx - Period list, close/reopen actions
  FixedAssetsPage.tsx       - Fixed asset list, add asset, run depreciation
  AccountingSettingsPage.tsx- Module settings (COA template, defaults)
```

### Backend (Laravel)
```
app/Http/Controllers/Api/V1/Accounting/
  ChartOfAccountController.php
  AccountingPeriodController.php
  JournalEntryController.php
  GeneralLedgerController.php
  RatioController.php
  FixedAssetController.php

app/Services/Accounting/
  ChartOfAccountService.php
  AccountingPeriodService.php
  JournalEntryService.php
  GeneralLedgerService.php
  RatioService.php
  FixedAssetService.php
  AutoAccountingService.php

app/Models/
  AccountingPeriod.php
  AccountType.php
  ChartOfAccount.php
  JournalEntry.php
  JournalEntryLine.php
  FixedAsset.php
  DepreciationEntry.php

database/migrations/
  xxxx_xx_xx_create_account_types_table.php
  xxxx_xx_xx_create_chart_of_accounts_table.php
  xxxx_xx_xx_create_accounting_periods_table.php
  xxxx_xx_xx_create_journal_entries_table.php
  xxxx_xx_xx_create_journal_entry_lines_table.php
  xxxx_xx_xx_create_fixed_assets_table.php
  xxxx_xx_xx_create_depreciation_entries_table.php

database/seeders/
  AccountingSeeder.php          - Default URA-compliant COA template
  AccountingPeriodSeeder.php    - Initial period creation
```

### Modified Files
```
Frontend/
  src/renderer/app/routes/index.tsx              - Added accounting route group
  src/renderer/app/routes/constants/shared.paths.ts - Added ROUTES.ACCOUNTING
  src/renderer/shared/components/layout/Sidebar.tsx - Added accounting nav items
  src/renderer/shared/utils/moduleAccess.ts       - Added 'accounting' module

Backend/
  routes/api.php                - Registered accounting API routes
  app/Providers/AppServiceProvider.php - Service registrations
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/chart-of-accounts` | List all accounts |
| POST | `/chart-of-accounts` | Create a new account |
| GET | `/chart-of-accounts/tree` | Get COA as hierarchical tree |
| GET | `/chart-of-accounts/{id}` | Get single account |
| PUT | `/chart-of-accounts/{id}` | Update account |
| DELETE | `/chart-of-accounts/{id}` | Deactivate account |
| GET | `/accounting-periods` | List all periods |
| POST | `/accounting-periods` | Create new period |
| GET | `/accounting-periods/current` | Get current (open) period |
| GET | `/accounting-periods/{id}` | Get single period |
| PUT | `/accounting-periods/{id}` | Update period |
| DELETE | `/accounting-periods/{id}` | Delete period |
| POST | `/accounting-periods/{id}/close` | Close period (lock entries) |
| POST | `/accounting-periods/{id}/reopen` | Reopen closed period |
| GET | `/journal-entries` | List journal entries |
| POST | `/journal-entries` | Create draft journal entry |
| GET | `/journal-entries/{id}` | Get entry with lines |
| PUT | `/journal-entries/{id}` | Update draft entry |
| DELETE | `/journal-entries/{id}` | Delete draft entry |
| GET | `/journal-entries/{id}/lines` | Get entry lines |
| POST | `/journal-entries/{id}/post` | Post entry (immutable lock) |
| POST | `/journal-entries/{id}/reverse` | Create reversing entry |
| GET | `/general-ledger/trial-balance` | Trial balance (optional `?period_id=`) |
| GET | `/general-ledger/profit-loss` | Income statement (optional `?period_id=`) |
| GET | `/general-ledger/balance-sheet` | Balance sheet (optional `?period_id=`) |
| GET | `/ratios` | Financial ratios (optional `?period_id=`) |
| GET | `/fixed-assets` | List fixed assets |
| POST | `/fixed-assets` | Register new fixed asset |
| GET | `/fixed-assets/{id}` | Get asset details |
| PUT | `/fixed-assets/{id}` | Update asset |
| DELETE | `/fixed-assets/{id}` | Remove asset |
| POST | `/fixed-assets/run-depreciation` | Run depreciation for period |
| GET | `/fixed-assets/{id}/schedule` | Get depreciation schedule |

## Data Model

```
AccountType (1) ──< ChartOfAccount
     name: Asset|Liability|Equity|Revenue|Expense
     normal_balance: debit|credit

ChartOfAccount
     id, business_id, code, name, parent_id, type_id, normal_balance, is_active
     parent_id ──< self-referential hierarchy

AccountingPeriod
     id, business_id, name, start_date, end_date, is_closed, closed_by, closed_at

JournalEntry (1) ──< JournalEntryLine (many)
     entry_number, date, description, reference_type, reference_id,
     period_id, created_by, locked, posted_at

JournalEntryLine
     entry_id, account_id, debit_amount, credit_amount, description

FixedAsset
     id, business_id, account_id, name, cost, salvage_value,
     useful_life_months, purchase_date, book_value, status

DepreciationEntry
     id, asset_id, period_id, amount, accumulated_depreciation, book_value_after
```

## User Guide

### Chart of Accounts
Navigate to **Accounting → Chart of Accounts**. Switch between Flat View (sortable table, filterable by type) and Tree View (hierarchical parent-child display). Click **Add Account** to create a new account - enter code, name, type, and normal balance.

### Journal Entries
**Accounting → Journal Entries**. Click **New Entry** to open the line editor. Add at least 2 lines with matching debit/credit totals. The form shows a real-time balanced/unbalanced indicator. Once created, click **Post** to lock the entry (irreversible). To correct a posted entry, use the reversing workflow.

### Trial Balance
**Accounting → Trial Balance**. Select a period to view the trial balance - all accounts with their debit/credit balances. Shows whether debits equal credits.

### Income Statement
**Accounting → Income Statement**. Period-filtered profit & loss report grouped by revenue, COGS, and expense sections. Shows gross profit, operating income, net income.

### Balance Sheet
**Accounting → Balance Sheet**. Period-filtered balance sheet with asset, liability, and equity sections. Verifies that assets = liabilities + equity.

### Financial Ratios
**Accounting → Ratios**. Period-filtered dashboard of liquidity (current, quick), solvency (debt-to-equity, debt ratio), efficiency (asset turnover, inventory turnover), and profitability (gross margin, net margin, ROA, ROE) ratios.

### Fixed Assets
**Accounting → Fixed Assets**. Register assets with cost, salvage value, and useful life. The system calculates straight-line depreciation. Click **Run Depreciation** to post depreciation journal entries for the period. View the full depreciation schedule for any asset.

### Periods
**Accounting → Periods**. View all accounting periods. Close a period to prevent new entries. Reopen only if corrections are absolutely necessary.

### Settings
**Accounting → Settings**. Configure module-level settings (accounting start date, default COA template).

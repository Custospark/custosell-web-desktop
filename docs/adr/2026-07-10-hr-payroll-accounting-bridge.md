# ADR-2026-07-10: HR payroll ↔ Accounting bridge (fail-hard)

**Status:** Approved

**Date:** 2026-07-10

**Authors:** Custospark Product Development Team

## Context

Payroll posting previously soft-failed journal creation while still marking the pay run `posted`, lumped all liabilities into Accrued Expenses (`2103`), and had no void/settlement path. Books and HR could diverge silently.

## Decision

1. **Fail hard on post** - Accrual journal must succeed or the run stays `approved` with `posting_note`. Never mark `posted` without `posted_journal_entry_id`. Legacy soft-failed rows may retry post.
2. **Split liabilities** - Accrual journal:
   - Dr `6101` Salaries & Wages (gross + employer NSSF)
   - Cr `2110` Salaries Payable (net + other deductions)
   - Cr `2111` PAYE Payable
   - Cr `2112` NSSF Payable (employee + employer)
3. **Settlement** - `POST …/settle` clears `2110` against Bank/Cash (`1102`/`1101`).
4. **Statutory remittance** - `POST …/remit-statutory` clears `2111`+`2112` against Bank/Cash.
5. **Void** - `POST …/void` reverses settlement → statutory → accrual journals (reversals use `*_reversal` reference types), then sets `status=void`.
6. **Supported unwind path** is void from HR. Reversing a journal only in Accounting does not auto-update the pay run (documented follow-up).

## Consequences

### Positive

- GL and pay-run status stay consistent on post failure.
- PAYE/NSSF/net are distinguishable on the balance sheet.
- Cash movement is recorded when wages are paid and statutory remitted.

### Negative

- Posting requires seeded payroll COA and an open period covering `period_end`.
- Void requires an open period for reversing entry dates (today).

## Alternatives considered

### Keep soft-fail with retry-only

**Rejected.** Operators treated “posted” as “in the books.”

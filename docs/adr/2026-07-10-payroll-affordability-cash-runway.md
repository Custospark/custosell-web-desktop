# ADR: Payroll affordability & cash runway

**Date:** 2026-07-10  
**Status:** Accepted

## Context

HR and owners need a precise answer to: can we clear salaries and statutory obligations this month, next month, and for N months ahead? They also need a hire what-if: if we add someone at salary X, how long can cash keep up?

Historical Cash Flow Statement and liquidity ratios alone cannot answer that - they do not project payroll burn or compare need vs cash.

## Decision

Ship a single **read-only** report under full HR:

`POST /api/v1/hr/reports/payroll-affordability`

Optional `hire` body runs a scenario without writing compensations or journals.

### Source of truth

| Input | Source |
|-------|--------|
| Cash available | GL **closing** balances `1101` + `1102` |
| Unpaid payroll | GL closing `2110` + `2111` + `2112` |
| Monthly burn | Live compensations × `calculateEmployeePay` → `Σ(gross + nssf_employer)` |
| Period | Open period covering `as_of_date`, else latest |

Balances use **closing_balance**, not period activity, so unpaid liabilities and cash match the trial balance.

### Month ladder (conservative)

```
unaccrued_this_month = max(0, monthly_burn − min(monthly_burn, unpaid))
need(0) = unpaid + unaccrued_this_month
need(m>0) = need(0) + monthly_burn × m
can_cover(m) = cash_available ≥ need(m)
```

Phase 1 assumes **no** non-payroll inflows or other operating outflows. Warnings always state that.

### Hire scenario

Ephemeral compensation → same PAYE/NSSF engine → incremental burn applied from `start_month_offset`.

### Companion accounting fixes

Liquidity current liabilities and Cash Flow Statement working-capital changes now include **2110-2112** so ratios/CFS stay consistent with payroll posts.

## Consequences

- UI: HR → Reports → “Payroll cash runway” (loads on mount).
- Gate: `hr_full` only (same as statutory reports).
- Not a full cash forecast ERP - refine later with AR collection assumptions if needed.
- Requires an accounting period; otherwise 422.

## Related

- [HR module notes](../modules/hr.md)
- [Payroll accounting bridge](./2026-07-10-hr-payroll-accounting-bridge.md)
- [Accounting module](../accounting-module.md)

# ADR-2026-07-11: Company Assets (HR custody) ↔ Fixed Assets (Accounting)

**Status:** Approved

**Date:** 2026-07-11

**Authors:** Custospark Product Development Team

## Context

Organizations need to know which company resources (laptops, phones, furniture) exist, who holds them, and how cost/depreciation hits the books. Accounting already had a partial fixed-asset register (cost, useful life, straight-line depreciation). HR had no custody model. Putting “Fixed Asset Management” only under HR would duplicate the financial register; putting custody only under Accounting would hide people workflows from HR.

## Decision

1. **One record, two surfaces** - `fixed_assets` is the shared register.
2. **HR - Company Assets** (`/hr/company-assets`, `hr_full`) owns operational custody: asset tag, serial, category, location, condition, assign / transfer / return, assignment history, employee “Assets issued” panel.
3. **Accounting - Fixed Assets** (`/accounting/fixed-assets`) owns financial fields and GL: cost, salvage, useful life, book value, run depreciation, schedule.
4. **Expenses** may optionally set `fixed_asset_id` for repair/maintenance; rollup surfaces on Company Assets detail. Depreciation remains journal-only (Dr 6300 / Cr 1205) - never duplicated from HR.
5. **Inventory** stays sellable stock - not company assets.
6. **API split:**
   - Accounting: existing `/fixed-assets` CRUD + `run-depreciation` + `schedule` (module `accounting`).
   - HR: `/hr/company-assets` list/show/store/update custody + assign/transfer/return + assignments + maintenance expenses (module `hr` + `hr.full`).
7. **Failure states:** assign when already assigned → 422; return when unassigned → 422; dispose while assigned → 422; invalid `fixed_asset_id` on expense → 422; depreciation on disposed → skipped/blocked in DepreciationService.

## Consequences

### Positive

- HR language (“Company Assets”) does not collide with Accounting “Fixed Assets.”
- Financial compliance stays in Accounting; people workflows stay in HR.
- Maintenance costs can roll into asset history without inventing a second GL path.

### Negative

- Users with only HR (no Accounting) can manage custody but must rely on Accounting (or an accountant) for depreciation runs.
- Creating an asset from HR still needs a valid CoA `account_id` (category maps to 1201-1204 when omitted).

## Alternatives considered

### Full Fixed Asset Management under HR only

**Rejected.** Depreciation and JE posting already live in Accounting; duplicating would diverge book value and GL.

### Custody fields only on Accounting Fixed Assets UI

**Rejected.** HR operators assign equipment; forcing them into Accounting is poor UX and wrong module gate.

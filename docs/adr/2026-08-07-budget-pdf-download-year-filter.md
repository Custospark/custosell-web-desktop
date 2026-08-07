# ADR: Budget PDF Download + Year Filter / Search

**Date:** 2026-08-07
**Status:** Accepted

## Context

Personal-account users needed to take their budgets off-screen — a printable "document" of a budget (its plan, linked income, and spend) so they can keep a paper copy or share it. Budgets accumulate across years, so the My Budgets page also needed a way to find a specific budget when there are many.

## Decisions

1. **PDF, not XLSX.** Budgets are personal planning documents, so the download uses the backend's canonical PDF path (`BudgetPdfBuilder` → `ReportExportService::downloadPdf` → DomPDF on `reports.layouts.base`). XLSX (PhpSpreadsheet) is reserved for data exports, not documents.
2. **Personal-account header.** For `account_type === 'personal'`, the PDF header and filename use the **user's name**, not the business name — budgets are personal documents. The builder replicates the business model and overrides `name` for the header/filename only.
3. **PDF contents.** Summary cards (Planned / Spent / Income / Remaining, with tone for negative remaining), the plan lines table (item, qty, unit price, line total, bought), income table, spend table, and a remaining total row.
4. **New endpoint.** `GET /budgets/{budget}/download` behind the same `auth:sanctum + business.active + subscription.active + module:expenses` guards, ownership-checked like `show` via `findOwned`.
5. **FE download pattern mirrors invoices/estimates.** `useBudgetPdf.ts` fetches a blob (`responseType: 'blob'`), parses `Content-Disposition` for the filename, and triggers the save through the shared `downloadBlob` helper. The card shows a spinner while downloading and toasts on failure.
6. **Year filter + search on My Budgets.** A year `<select>` (derived from `period_start`/`period_end`, shown only when more than one year exists) and a name search box filter the card grid client-side; an empty state offers "Clear filters".
7. **Hooks run before early returns.** The `years`/`visibleBudgets` memos are computed from `data?.budgets ?? []` above the loading/error early returns so the hook order is stable.

## Consequences

- Every budget can be downloaded as a branded PDF document (personal name for personal accounts).
- My Budgets stays navigable with many budgets across years via search + year filter.
- No schema changes; the download derives everything from existing `show()` data sources (`lines`, `expenses`, `income`, `summarise`).

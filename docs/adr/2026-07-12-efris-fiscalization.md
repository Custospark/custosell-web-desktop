# ADR: URA EFRIS fiscalization (v1)

**Date:** 2026-07-12  
**Status:** Accepted (implemented - gated by `EFRIS_ENABLED`)  
**Scope:** Backend fiscal client/queue + Frontend status UX + docs  
**Country:** Uganda first; other jurisdictions configurable later

## Context

VAT-registered Ugandan businesses need electronic fiscal receipts/invoices via **URA EFRIS**. Custosell must support this without blocking offline-first POS, and without forcing every deployment (or every country) onto EFRIS.

## Decisions

1. **Uganda-first, country-configurable**  
   - v1 provider is **UG EFRIS** only.  
   - Config retains `EFRIS_COUNTRY` (default `UG`) so future e-invoicing regimes can plug in behind the same feature surface.

2. **Direct URA EFRIS API - not a hardware fiscal device**  
   - `EFRIS_MODE=api`.  
   - No EFD / Rank-style device path in v1.

3. **Fiscalize both POS sales and sales invoices**  
   - `EFRIS_FISCALIZE_POS=true`  
   - `EFRIS_FISCALIZE_INVOICES=true`

4. **Offline: allow sale, sync fiscal later**  
   - `EFRIS_OFFLINE_MODE=sync_later`  
   - Checkout must not hard-block waiting for URA when offline or when the API is slow.  
   - Fiscal jobs enqueue and retry when online.

5. **Master switch**  
   - `EFRIS_ENABLED=false` by default.  
   - When false, **no** URA calls and **no** fiscal queue behaviour - Custosell sells as today.  
   - Credentials live in Backend `.env` (pilot / sandbox values supplied by Oscar).

6. **Credentials & procedures**  
   - Documented in [../compliance/efris-setup.md](../compliance/efris-setup.md).  
   - `.env.example` carries commented placeholders + link to that doc.

## Non-goals (v1)

- Hardware EFD integration.  
- Blocking checkout until fiscalized.  
- Multi-country e-invoicing implementations beyond the config hook.  
- Committing real TIN / keys to git.

## Implementation map

| Layer | Location |
|-------|----------|
| Config | `Backend/config/efris.php` |
| Env template | `Backend/.env.example` (EFRIS section) |
| Procedures | [../compliance/efris-setup.md](../compliance/efris-setup.md) |
| Persistence | `sales` / `invoices` `fiscal_*` columns |
| Client + service | `Backend/app/Services/Efris/` (gated on `config('efris.enabled')`) |
| Queue jobs | `FiscalizeSaleJob`, `FiscalizeInvoiceJob` - run `php artisan queue:work` |
| Safe status API | `GET /api/v1/efris/status` (no credentials) |
| FE status UX | Sale/invoice chips, receipt FDN/QR, Tax → EFRIS panel |

## Failure states (target behaviour)

| Case | Behaviour |
|------|-----------|
| `EFRIS_ENABLED=false` | Ignore all EFRIS paths |
| Offline sale | Complete sale; enqueue fiscal sync |
| URA / sandbox error | Keep sale; mark fiscal pending/failed; retry + surface in diagnostics |
| Missing credentials with enabled=true | Fail closed on fiscal submit; do not invent receipts; log clearly |

## Related

- Tax jurisdiction hints: `src/renderer/shared/utils/taxJurisdictions.ts` (`UG` → URA)  
- Accounting URA compliance docs (books ≠ EFRIS receipts)

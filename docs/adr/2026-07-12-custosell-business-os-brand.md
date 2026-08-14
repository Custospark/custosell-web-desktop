# ADR: Custosell Business OS brand

**Date:** 2026-07-12  
**Status:** Accepted (Phase 1 + Phase 2 landing)  
**Scope:** Frontend brand copy; Blade emails/reports follow in Phase 3

## Context

Custosell began as a POS product. The lockup **“Sell More. Track All. Grow Fast.”** no longer matches the product: sales, inventory/supply, pipeline, projects, documents, HR, accounting, forecasting, and offline-first operations.

## Decisions

1. **Primary tagline:** `Your Business Operating System`
2. **Short lockup:** `Business OS`
3. **Supporting line (module list):** mirrors Frontend `SUPPORTING_LINE` and Backend `config/brand.php` `supporting_line` - includes **E-commerce Storefront** after POS (Discover public shop).
4. **Single FE source of truth:** [`src/renderer/shared/brand/custosellBrand.ts`](../../src/renderer/shared/brand/custosellBrand.ts) (`SUPPORTING_LINE` for auth; landing hero uses the same wording with emphasis markup).
5. **Retire** “Sell More. Track All. Grow Fast.” from auth, app footer, document title, and related shell surfaces in Phase 1.
6. **Phased rewrite:** Phase 1 auth/shell → Phase 2 landing → Phase 3 Backend Blade emails/reports (`config/brand.php` supporting line already aligned).

## Phase 1 surfaces

| Surface | Change |
|---------|--------|
| Auth layout / login / register | Business OS eyebrow + tagline + supporting line |
| App footer | Tagline lockup |
| Offline full-page | Tagline |
| `index.html` title / OG | Business OS |
| Shift close report footer | Tagline (shared FE report chrome) |

## Phase 2 surfaces

| Surface | Change |
|---------|--------|
| Landing hero | Business OS + module list including E-commerce Storefront |
| Landing “What You Get” | Modules named clearly (POS, E-commerce Storefront, Inventory & Supply Chain, Documents, Projects, etc.) |
| Landing layout footer | Brand lockup |

## Non-goals (remaining)

- Backend Blade email/report templates (Phase 3)

## Related

- Intent / tour international “run your business” tone: [2026-07-11-intent-and-app-tour.md](./2026-07-11-intent-and-app-tour.md)

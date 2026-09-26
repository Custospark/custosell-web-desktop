# ADR: EFRIS as a first-class app module (Phase 1 shell)

**Date:** 2026-09-26
**Status:** Accepted (Phase 1 implements the shell)
**Scope:** `efris` module slug end-to-end (backend + frontend), no fiscal logic changes

## Context

EFRIS fiscalization shipped behind a deployment-level env switch (`EFRIS_ENABLED`)
with global credentials. The product decision (Problem #1) is to sell and manage
fiscalization as an **app/add-on** like every other module: visible in Custosell
Apps, gated per business, with its own sidebar home. The full engine (vault,
stock recon, adapters, hardware) is specified in
`Backend/docs/fiscal-engine-architecture.ipynb` and lands in later phases.

## Decisions

1. **Slug `efris`, label EFRIS.** Technical and exact; eTIMS and later regimes
   arrive as sibling slugs, not renames.
2. **Pilot-included, not paid-gated.** `efris` bypasses plan-feature gating
   exactly like `settings`, on both stacks
   (`ModuleCatalog::PLAN_EXEMPT_MODULES`, `getPlanAccessibleModules`,
   `getPlanBusinessCatalog`). Paid gating is an explicit later phase: remove
   the exemptions and seed `plan_features.efris`.
3. **Catalogs extracted before growing.** Backend
   `ModuleAccessService` (498 lines) aliases `ModuleCatalog`; frontend
   `moduleAccess` re-exports `moduleCatalog`. No file may exceed 500 lines.
4. **Phase 1 changes no fiscal behavior.** Existing hooks stay env-gated;
   per-business enforcement arrives with the credentials vault (Phase 2).
   Legacy owners are additively granted `efris` via `POST_CORE_CATALOG_MODULES`
   (visible tile, hideable in one click) rather than force-enabled anywhere.
5. **Single overview page** (`/efris/overview`) reusing the safe status API;
   credentials UI is Phase 2 scope.

## Consequences

- Staff may be granted `efris` through the existing staff form (plan catalog).
- Sidebar, launcher, search, onboarding picker, and Your Tools pick it up
  through the standard module machinery - no special cases.
- `getPlanBusinessCatalog` has one canonical copy (launcher catalog); the
  Settings form imports it instead of duplicating.

## Later phases

- P2: `fiscal_credentials` vault + business-aware enforcement + sandbox spike.
- P3: stock reconciliation (snapshots, variance UI, approve-and-push).
- P4: paid gating (drop exemptions, seed plan features, pricing).
- P5: legacy ERP adapters (Excel first). P6: multi-country drivers.
- P7: hardware (conditional on software traction).

# ADR: Pipeline board seeds and owner module catalog

**Date:** 2026-07-13  
**Status:** Accepted  
**Owners:** Mike (orchestration), Rex (FE/BE), Quill (docs)

## Context

New and legacy businesses need predictable pipeline/project board presentation and a complete owner module catalog without undoing intentional opt-outs after a one-time backfill.

1. **Board appearance.** Gallery and upload backgrounds can fail to load (CDN, CORS, offline). Without a solid underpaint, the board canvas and list-card heroes flash empty or grey.
2. **Owner Module Access save.** `OwnerModuleAccessForm` previously PUT name + email + modules, then required `/auth/me` to succeed. False failures appeared when ME failed after a successful PUT, and raw API messages were noisy.
3. **Legacy owners.** Older owner rows may be missing newer `BUSINESS_MODULES` slugs that were added after account creation. Owners who later turn modules off must keep those opt-outs.

## Decision

### Guiding cards and gallery defaults

- Backend `PipelineBoardSeedService` seeds gallery backgrounds via external picsum URLs + `cover_color`, and guiding leads/cards on empty pipeline and project boards (create path + migration `2026_07_13_120000_seed_pipeline_board_defaults.php`).
- When rendering gallery or upload backgrounds, FE sets `backgroundColor: cover_color ?? '#6366f1'` under the image (Documents cabinet pattern) so a failed external image still shows the board accent.
- List-card heroes keep gradient overlays and also underpaint with `cover_color` for the same fallback.

### Owner module save reliability

- Profile Module Access saves send a **modules-only** PUT body: `{ modules: resolvedModules }` to `PUT /auth/profile` (BE allows modules without name/email for this path).
- The PUT response is the primary source of truth via `extractAuthUser`.
- A best-effort `GET /auth/me` follows; if ME fails, the save still succeeds with the PUT user (same posture as StaffQueries self-edit refresh).
- Errors use `sanitizeErrorMessage` with fallback `'Could not update module access'`.

### One-time additive grant for legacy owners

- Migration `2026_07_13_121000_backfill_owner_missing_business_modules.php` calls `ModuleAccessService::grantMissingCatalogModulesToOwner`.
- **Post-core modules only** (accounting, pipeline, estimates, documents, hr, forecasting) are appended when missing - so intentional opt-outs of core POS modules (e.g. inventory) are not re-forced.
- Owners with empty/null `modules` persist the full current catalog + `estimates_full` + `hr_full` (same as new signup).
- Full workspace flags are granted for signup parity when the owner already has a non-empty catalog.
- After that backfill, intentional opt-outs stick - the grant does not re-run on login.
- Settings remains required for the owner account (`normalizeOwnerModules`).
- **Future modules:** when `BUSINESS_MODULES` grows, add the new slug to `POST_CORE_CATALOG_MODULES` (if post-core) and ship a backfill migration - do not auto-union on every `/auth/me`.

## Consequences

- Board canvases and card heroes degrade gracefully when gallery images fail.
- Module Access saves no longer fail solely because `/auth/me` is unavailable after a successful PUT.
- Legacy owners see newly introduced modules once after backfill; subsequent opt-outs stick.

## Failure states

| Case | Behavior |
|------|----------|
| Gallery/upload image URL fails to load | Solid `cover_color` (or indigo default) remains visible under the image layer |
| PUT modules succeeds, `/auth/me` fails | FE applies PUT user to Redux + secure storage; toast success |
| PUT modules fails (validation/network) | Toast via `sanitizeErrorMessage`; local modules state unchanged |
| Owner opt-outs after backfill | Additive grant does not re-run; opt-outs remain |

## Key files

| Area | Path |
|------|------|
| Owner Module Access UI | `src/renderer/modules/settings/ui/OwnerModuleAccessForm.tsx` |
| Board background helpers | `src/renderer/modules/pipeline/api/pipelineKanbanCache.ts` |
| Documents underpaint precedent | `src/renderer/modules/documents/ui/cabinetMeta.ts` |
| Module catalog helpers | `src/renderer/shared/utils/moduleAccess.ts` |
| BE board seed | `Backend/app/Services/Pipeline/PipelineBoardSeedService.php` |
| BE profile + modules | `Backend/app/Http/Controllers/Api/UserController.php`, `ProfileRequest`, `ModuleAccessService` |
| BE migrations | `2026_07_13_120000_seed_pipeline_board_defaults.php`, `2026_07_13_121000_backfill_owner_missing_business_modules.php` |

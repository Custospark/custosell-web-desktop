# ADR: Day-weighted long-horizon goal decomposition

**Date:** 2026-07-14  
**Status:** Accepted  
**Scope:** Frontend + Backend (Pipeline board Progress — KPI / Goal / OKR)

## Context

Managers plan decade / 5-year / year targets and need each future period (2026, 2027, … or months/weeks inside them) to show an accurate share of the full target, plus how much should be hit by the end of that period. Equal bucket counts gave stub edge weeks/months the same load as full periods, hid cumulative “by then” totals, and BE decade defaults floored to calendar decades (e.g. 2020–2029) instead of a rolling window from the current year.

## Decision

1. **Day-weighted cascade.** Slice share = `parent_share × days(slice ∩ parent) / days(parent)`. Root = `T × days(slice ∩ horizon) / days(horizon)`. Cascade year → quarter → month → week → day from the parent (not flat `root ÷ N`). Stage / member weights apply after the time share.
2. **Dual numbers on allocation / preview nodes.**
   - `expected_value` — this period’s share
   - `cumulative_expected` — `T × days(horizon_start → clip(period_end, horizon_end)) / days_horizon`
3. **Rolling anchors (FE + BE).** Decade = Jan 1 current year → Dec 31 of year+9; five_year → Dec 31 of year+4. FE sends `anchor_start` / `anchor_end` from **planning level** (`anchorsForPlanningLevel`), never from the Progress view chip.
4. **Progress card.** When `planning_level ∈ {decade, five_year, year}`, `period_slice.horizon_expected_to_date` is the day-weighted share of `T` from `anchor_start` through `min(now, anchor_end)`. Distinct from view-window `expected_to_date`.
5. **No silent remigration.** Existing equal-count allocations stay until the manager regenerates preview and saves.

## Consequences

- Decomposition preview lists year rows in full (cap 15) with “by end ≈ …” when `cumulative_expected` is present.
- Target cards show “Horizon expected so far: …” when `horizon_expected_to_date` is present.
- Old targets created before this change need regenerate → save to get day-weighted shares.

## Related

- [2026-07-08-progress-decomposition-engine.md](./2026-07-08-progress-decomposition-engine.md)
- [2026-07-08-board-progress-targets.md](./2026-07-08-board-progress-targets.md)
- Module guide: [../modules/pipeline-progress.md](../modules/pipeline-progress.md)
- BE: `PipelineGoalDecompositionService`, `Concerns/PipelineGoalDayWeighting`
- FE: `boardProgressAnchors.ts`, `DecompositionPreviewTree.tsx`, `BoardProgressShared.tsx`

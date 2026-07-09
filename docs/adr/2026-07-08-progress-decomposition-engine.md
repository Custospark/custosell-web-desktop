# ADR: Progress decomposition engine (column-aware v2)

**Date:** 2026-07-08  
**Status:** Accepted  
**Supersedes:** Sections of [2026-07-08-board-progress-targets.md](./2026-07-08-board-progress-targets.md) relating to metrics scope and target planning.

## Context

Board Progress v1 delivered board-wide KPIs, a count-only funnel, and KPI/Goal/Objective targets. Managers need:

- Column-scoped metrics (Kanban stages are mandatory for targets and charts)
- Planning horizons from decade down to day with automatic decomposition
- Expected vs actual analytics when headcount or velocity changes
- Personal progress and pace alerts for contributors

## Decision

Adopt a **hybrid decomposition model**:

1. **Persist** root targets, planning metadata (`planning_level`, `anchor_start`/`anchor_end`, `stage_id`), decomposition mode, and child **allocations** (with optional `is_override`).
2. **Compute at read time** daily/weekly **expected_to_date** using elapsed fraction of period × allocation, current team size, and 90-day column throughput weights.

### Data model (Backend)

- `pipeline_board_targets`: `planning_level`, `anchor_start`, `anchor_end`, `stage_id`, `decomposition_mode`, `goal_tag`
- `pipeline_board_target_allocations`: child expectations per period/member/stage
- `pipeline_board_progress_configs`: per-board chart layouts (`config_json`)
- `pipeline_board_metric_snapshots`: `stage_id` on unique key for column snapshots
- `pipeline_board_target_events`: audit log for overrides and plan changes

### Services

- `PipelineColumnMetricsService` — per-stage count, throughput, dwell, overdue; capacity recommendations
- `PipelineGoalDecompositionService` — preview, persist allocations, expected-to-date
- `PipelineBoardProgressService` — summary/query/my progress; integrates column metrics and decomposition

### API

| Route | Purpose |
|-------|---------|
| `GET …/progress/summary` | `stage_ids[]`, period, custom range; returns column metrics, expected trends, pace alerts, capacity recommendations |
| `GET …/progress/query` | On-demand filtered series |
| `GET …/progress/my` | Member-scoped summary |
| `GET/PUT …/progress/config` | Saved chart layouts |
| `POST …/targets/decompose-preview` | Preview tree before save |

### Frontend

- **Progress canvas**: Team / My tabs, column multi-select, chart builder, walkthrough, funnel count/value with stage colors, expected pace overlay
- **Target drawer**: Planning level, required column, decomposition preview with overrides, key results inherit column
- **Export**: JSON + CSV including allocation tree

## Consequences

- New targets require `stage_id`; legacy rows remain nullable until edited.
- Summary polls should pass `stage_ids[]` for consistent column scope.
- Backend migration `2026_07_08_230000_extend_pipeline_board_progress_v2` must run before v2 features work.

## References

- Module guide: [../modules/pipeline-progress.md](../modules/pipeline-progress.md)
- Prior ADR: [2026-07-08-board-progress-targets.md](./2026-07-08-board-progress-targets.md)

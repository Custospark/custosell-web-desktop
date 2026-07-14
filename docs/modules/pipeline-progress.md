# Pipeline board progress

Column-aware metrics, goal decomposition, and personal progress for Kanban boards (pipeline leads and project tasks).

## Entry points

| UI | Path |
|----|------|
| Progress canvas | Board Kanban → bottom strip **Progress** |
| Target drawer | Progress → **Add target** |
| My progress | Progress → **My progress** tab |

## Planning hierarchy

| Level | Code | Typical decomposition |
|-------|------|------------------------|
| Decade | `decade` | 5-year blocks |
| 5-year | `five_year` | Years |
| Year | `year` | Q1–Q4 → months → weeks → days |
| Quarter | `quarter` | Months → weeks → days |
| Month | `month` | Weeks → days |
| Week | `week` | Days |
| Day | `day` | Leaf |

**Anchor dates** (`anchor_start`, `anchor_end`) define the planning window. FE always sends them from the target **planning level** (not the Progress view chip). When omitted, BE defaults match FE: decade / five_year roll from Jan 1 of the current year.

**Day-weighted shares:** each child period gets `parent_share × days(slice ∩ parent) / days(parent)`. Preview nodes include `cumulative_expected` (how much of `T` should be hit by that period’s end). For decade / five_year / year targets, `period_slice.horizon_expected_to_date` is the horizon share elapsed through today (shown on the card as “Horizon expected so far”). Existing equal-count allocations need regenerate → save to refresh.

## Column-aware metrics

Every target and chart series references at least one `stage_id`. Summary accepts `stage_ids[]` to filter column metrics, funnel, and trends.

| Key pattern | Meaning |
|-------------|---------|
| `stage:{id}:count` | Items currently in column |
| `stage:{id}:throughput` | Moves into column in period |
| `stage:{id}:avg_dwell_days` | Average days in column |
| `stage:{id}:overdue` | Overdue open items in column |

Global keys (`cards_won`, `win_rate`, etc.) remain board-wide.

## Decomposition example

**Goal:** Win 120 leads in calendar year 2026 on column “Negotiation” (`stage_id=4`).

1. Manager sets type **Goal**, planning level **Year**, target **120**, column **Negotiation**.
2. Click **Show decomposition preview** (one API call per click — no auto/debounced preview).
3. On save, allocations persist; read API recomputes **expected_to_date** as time elapses.
4. Trend chart shows dashed **Expected pace** vs actual `cards_won`.

When the period filter changes (day/week/month/quarter/year), target cards use `period_slice` from the API and show achievement as **x/y** for that window (e.g. Today with a 2/day pace → `1/2`). Coarser goals (month/year) are prorated into the selected view so the denominator matches the period. Percent and overall goal stay as secondary context.

**Assignee roster:** The ownership dropdown prefers board resource members, then project/board roster — not only members with activity in the selected period.

Manual edits to child periods set `is_override=true` and are recorded in `pipeline_board_target_events`.

## Personal progress

`GET /boards/{id}/progress/my` returns:

- Member metrics vs team average
- Member-scoped targets and pace alerts
- Column throughput for assigned work

## Capacity recommendations

Summary includes `capacity_recommendations` derived from 90-day throughput and dwell time — surfaces bottlenecks (high dwell + high WIP) and sustainable weekly pace per column.

## Export

Progress export downloads:

- **JSON** — full summary including `targets[].allocations` decomposition tree
- **CSV** — team metrics, targets, allocations, column throughput rows

## Frontend files

| File | Role |
|------|------|
| `BoardProgressView.tsx` | Main canvas |
| `BoardTargetFormDrawer.tsx` | Target create/edit with decomposition |
| `ProgressColumnSelector.tsx` | Column multi-select |
| `DecompositionPreviewTree.tsx` | Preview / override UI |
| `ProgressChartBuilder.tsx` | Saved chart layout |
| `BoardMyProgressTab.tsx` | Personal tab |
| `useBoardProgressQueries.ts` | React Query hooks |

## Related ADRs

- [2026-07-08-board-progress-targets.md](../adr/2026-07-08-board-progress-targets.md) — v1 Progress canvas
- [2026-07-08-progress-decomposition-engine.md](../adr/2026-07-08-progress-decomposition-engine.md) — v2 decomposition
- [2026-07-14-day-weighted-horizon-decomposition.md](../adr/2026-07-14-day-weighted-horizon-decomposition.md) — day-weighted cascade, cumulative + horizon expected
- [2026-07-13-pipeline-board-seeds-and-owner-module-catalog.md](../adr/2026-07-13-pipeline-board-seeds-and-owner-module-catalog.md) — gallery/upload underpaint + board seeds

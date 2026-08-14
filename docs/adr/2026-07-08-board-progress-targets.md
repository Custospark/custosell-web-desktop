# ADR: Board Progress and Targets

**Date:** 2026-07-08  
**Status:** Accepted

## Context

Pipeline and project boards need a shared **Progress** experience: metrics, trends, team performance, and board-scoped **Targets** (KPIs, goals, full OKR trees). Copy must differ between **pipeline boards** (leads, wins, pipeline value) and **project boards** (tasks, completed, estimated value). Users access Progress from the bottom strip next to **Resources**, not the Board | Calendar header toggle.

## Decision

### UX placement

- **Progress** button lives in `BoardSwitcherIcons` beside Resources.
- Header keeps **Board | Calendar** only; Progress replaces the main canvas when active.
- User-facing **Conversation** label becomes **Discussion** (API routes remain `conversation`).

### Backend

- Tables: `pipeline_board_targets`, `pipeline_board_metric_snapshots`.
- `PipelineBoardProgressService` computes summary metrics, funnel, trends, target pace, and OKR rollups.
- REST under `/pipeline/boards/{boardId}/progress/*` and `/pipeline/targets/{targetId}`.
- Daily snapshots via `php artisan pipeline:record-progress-snapshots` (scheduled nightly).

### Frontend

- `BoardProgressView` - charts, headline metrics, member table, targets list.
- `BoardTargetFormModal` - create/edit KPI, goal, objective + key results on create (centered modal).
- `pipelineProgressTerms.ts` - board-aware labels for pipeline vs project vs estimates.
- Progress queries poll every 30s when the Progress canvas is open; pipeline mutations invalidate progress cache.

### Permissions

- View progress: anyone who can view the board.
- Manage targets: `can_manage_settings` on the board (same as board settings).

## Consequences

- Progress is online-first (no offline queue for targets in v1).
- Historical charts beyond live trends depend on the snapshot job running in production.
- OKR key results are created with the objective; post-create KR editing is out of scope until a follow-up API.

## Related

- [2026-07-08-pipeline-board-member-roles.md](./2026-07-08-pipeline-board-member-roles.md)

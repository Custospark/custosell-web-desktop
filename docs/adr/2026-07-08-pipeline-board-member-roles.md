# ADR-2026-07-08: Pipeline Board Member Roles (Viewer, Contributor, Manager)

**Status:** Approved

**Date:** 2026-07-08

**Authors:** Custospark Product Development Team

## Context

Custosell pipeline boards support team collaboration through:

- **Team** and **private** visibility (workspace-wide or owner-only access)
- **Shared** boards with explicit invites (`pipeline_board_members`)
- **Project** boards with a separate project team (`project_members`)

Early shared-board invites stored only two roles: `viewer` and `editor`. The UI sometimes labeled `editor` as “Contributor” or “Editor”, while project boards already used a three-role model: `viewer`, `contributor`, `manager`.

The `editor` role was overloaded: it granted both **content edit** permissions (move cards, reorder columns) and **management** permissions (board settings, archive, delete). That diverged from product intent and from project-board semantics.

## Decision

Adopt a **single three-role model** for shared pipeline board members, aligned with project boards:

| Role | Stored value | Permissions |
|------|--------------|-------------|
| **Viewer** | `viewer` | View board, cards, conversation, resources, activity |
| **Contributor** | `contributor` | Viewer + move cards, reorder columns, add cards, comment, add resources |
| **Manager** | `manager` | Contributor + board settings, invites, archive/delete, column CRUD, automations |

**Always managers (regardless of invite role):**

- Business owner
- Board owner (`created_by`)
- Project board: project owner, full estimates access, or project `manager` role

### Backend enforcement (`PipelineService`)

| Action | Gate |
|--------|------|
| View kanban / leads | `assertCanViewBoard` |
| Move lead, reorder columns, post conversation, add resources | `assertCanEditBoard` → contributor or manager on shared boards |
| Board settings, archive board/lead, add/edit/delete stages, automations | `userCanManageBoard` / `assertCanManageBoard` → manager on shared boards |

Legacy API value `editor` is normalized to `contributor` on read and write.

### Database migration

`2026_07_08_220000_board_member_three_roles.php`:

1. `UPDATE` existing `editor` rows → `contributor`
2. Alter `pipeline_board_members.role` enum to `viewer | contributor | manager` (default `contributor`)

### Frontend enforcement

| Helper | Purpose |
|--------|---------|
| `canManageBoardSettings` | Settings modal, archive, stage CRUD, automations |
| `canContributeToBoard` | Drag cards/columns, add cards, resources, card field edits |
| `normalizeBoardMemberRole` | Maps legacy `editor` → `contributor` |

**UI surfaces:**

- `BoardMemberPicker` — invite with Viewer / Contributor / Manager
- `BoardKanbanPage` — contribute vs manage action gates
- `LeadDetailModal` — viewer read-only banner; archive gated to managers
- Project boards — unchanged; still use `ProjectMemberPicker` + `project_members`

### API contract

```
PATCH /api/v1/pipeline/boards/{id}
members[].role: viewer | contributor | manager
(legacy editor accepted → stored as contributor)
```

## Consequences

### Positive

- Permissions match user-facing role names across pipeline and project boards.
- Contributors can collaborate on cards without gaining settings or delete access.
- Managers can delegate board administration without giving business-owner access.
- Backend and frontend use the same role vocabulary; legacy `editor` data migrates cleanly.

### Negative

- Existing shared-board `editor` members lose settings access after migration (they become contributors). Boards that relied on `editor` as a pseudo-manager must re-invite those users as **Manager**.
- Two member tables remain (`pipeline_board_members` vs `project_members`) with identical role names but separate storage — project boards still resolve permissions through `ProjectAccessService`.

## Alternatives Considered

### Keep `viewer` / `editor` and fix UI labels only

**Rejected.** `editor` could not express “move cards but not change board settings” without over-permissioning or under-permissioning one use case.

### Single `access_level` integer (0, 1, 2)

**Rejected.** Enum strings match project boards, API validation, and UI copy; integers add mapping layers without benefit.

### Merge project members into pipeline_board_members

**Deferred.** Project boards tie to `projects` and estimates workspace; unifying tables is a larger schema and sync change with no immediate user benefit.

## References

| Area | Path |
|------|------|
| Migration | `Backend/database/migrations/2026_07_08_220000_board_member_three_roles.php` |
| Permission service | `Backend/app/Services/PipelineService.php` |
| Project access | `Backend/app/Services/ProjectAccessService.php` |
| Role utilities (FE) | `Frontend/src/renderer/modules/pipeline/api/boardRoleUtils.ts` |
| Access helpers (FE) | `Frontend/src/renderer/shared/utils/moduleAccess.ts` |
| Member picker (FE) | `Frontend/src/renderer/modules/pipeline/ui/BoardMemberPicker.tsx` |

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

**Private-board exception (2026-07-08 update):**

- For non-project private boards, only the board creator can view/manage the board.
- Business-owner global override does not apply to private boards.

### Frontend enforcement

| Helper | Purpose |
|--------|---------|
| `canManageBoardSettings` | Settings modal, archive, stage CRUD, automations |
| `canContributeToBoard` | Drag cards/columns, add cards, resources, card field edits, comments, conversation posts, reminders |
| `normalizeBoardMemberRole` | Maps legacy `editor` → `viewer` on the client (permissions); API normalizes stored roles on output |

**Kanban (`BoardKanbanPage`, `KanbanColumn`):**

- Viewers: no card drag, column reorder, add card, or mark-complete toggle
- Contributors: move cards/columns, add cards, edit card content
- Managers: above + settings gear, add/edit/delete columns, archive cards

**Card detail (`LeadDetailModal`, `CardDetailExtras`):**

- Viewer banner when `!canContributeToBoard`
- All form fields read-only for viewers (title, contact, labels, checklists, attachments, dates, priority)
- Archive, convert, and proposal actions hidden or blocked unless role allows
- Contributors cannot delete other people's comments — only the comment author or a board manager/owner.

**Board conversation (`BoardConversationModal`):**

- Composer (post, reply, attach) gated with `canContribute`
- Viewers: read-only chat — no post, reply, react, edit, or delete on messages
- Pin/edit/delete still driven by per-message API flags (`can_pin`, `can_edit`, `can_delete`) for contributors/managers
- Board settings link from automations tab — managers only

**Comments (`LeadCommentsPanel`):**

- Viewers: read-only — no post, reply, react, edit, or delete on card comments

**Board collaboration (`BoardCollaborationDrawer`):**

- Viewers: notices and polls read-only — no post, dismiss, vote, or remove own vote
- Viewers may mark notices read/unread (read tracking is not a write action on board content)
- Contributors and managers may vote and remove their own vote at any time
- No one may remove another member's vote — Team participation is read-only

**Live updates (all roles):**

- Kanban polls every 45s (contributors/managers) or 20s (viewers); polls continue in background tabs
- Board access sync (15s) merges role flags and presentation fields (name, cover, background) into kanban cache
- Notices, polls, conversation, and resources summaries poll while the board page is open
- Only poll creators and board managers may remove other users' votes (Team participation)

**Shared-board invites (`BoardMemberPicker`):**

- Staff list uses `GET /pipeline/team-members?scope=business` (all active business staff)
- Team visibility listing still uses `scope=workspace` (module access)

### Backend enforcement (`PipelineService` + collaboration)

| Action | Gate |
|--------|------|
| View kanban / leads | `assertCanViewBoard` |
| Move lead, reorder columns, post conversation, add resources, card comments, reminders | `assertCanEditBoard` / `ensureCanContributeToBoard` → contributor or manager on shared boards |
| React on conversation messages or card comments | `ensureCanContributeToBoard` (viewers blocked) |
| Vote on polls, remove own poll vote | `ensureCanContributeToBoard` (contributors and managers) |
| Remove another user's poll vote | Not allowed — own vote only |
| Mark notices read | Any board member with view access |
| Mark notices read, dismiss collaboration items (delete/dismiss) | `ensureCanContributeToBoard` (viewers blocked for dismiss) |
| Board settings, archive board/lead, add/edit/delete stages, automations, upload background, create polls | `userCanManageBoard` / `ensureCanManageBoard` → manager on shared boards |

**Collaboration service fixes (viewers were incorrectly allowed):**

- `POST /pipeline/boards/{id}/background` — now `ensureCanManageBoard`
- `POST /pipeline/boards/{boardId}/polls` — now `assertCanManageBoard`
- `POST /pipeline/leads/{leadId}/reminders` — now `ensureCanEditBoard`

Legacy API value `editor` is normalized on the backend (`normalizeBoardMemberRole`: `editor` → `contributor` for stored rows). **Do not write `editor` to the DB** — `ProjectService::syncProjectBoardMember` maps project roles to `contributor` or `viewer` only.

`PipelineBoardResource` exposes server-authoritative flags for the current user:

- `can_contribute` — mirrors `userCanContributeToBoard`
- `can_manage_settings` — mirrors `userCanManageBoard`
- `current_member_role` — normalized shared-board invite role (or `manager` for owner/BO)

The frontend prefers these flags over client-side inference when present.

**Team members API:**

```
GET /api/v1/pipeline/team-members?workspace=pipeline|estimates&scope=workspace|business
```

- `scope=workspace` (default) — staff with Pipeline/Estimates module access (team board member list)
- `scope=business` — all active business staff (shared-board invite picker)

### Database migration

`2026_07_08_220000_board_member_three_roles.php`:

1. `UPDATE` existing `editor` rows → `contributor`
2. Alter `pipeline_board_members.role` enum to `viewer | contributor | manager` (default `contributor`)

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

## Migration note (MySQL ENUM)

The `role` column starts as `ENUM('viewer', 'editor')`. Data cannot be updated to `contributor` until the enum is expanded. The migration therefore:

1. Expands to `viewer | editor | contributor | manager`
2. Updates `editor` → `contributor`
3. Shrinks to `viewer | contributor | manager`

## References

| Area | Path |
|------|------|
| Migration | `Backend/database/migrations/2026_07_08_220000_board_member_three_roles.php` |
| Permission service | `Backend/app/Services/PipelineService.php` |
| Project access | `Backend/app/Services/ProjectAccessService.php` |
| Role utilities (FE) | `Frontend/src/renderer/modules/pipeline/api/boardRoleUtils.ts` |
| Access helpers (FE) | `Frontend/src/renderer/shared/utils/moduleAccess.ts` |
| Member picker (FE) | `Frontend/src/renderer/modules/pipeline/ui/BoardMemberPicker.tsx` |
| Kanban UI (FE) | `Frontend/src/renderer/modules/pipeline/pages/BoardKanbanPage.tsx`, `KanbanColumn.tsx` |
| Card detail (FE) | `Frontend/src/renderer/modules/pipeline/ui/LeadDetailModal.tsx`, `CardDetailExtras.tsx` |
| Collaboration (BE) | `Backend/app/Services/Pipeline/PipelineCollaborationService.php` |

# ADR: Board sync, delete, card import & product storefront UX

**Date:** 2026-07-14  
**Status:** Accepted  
**Scope:** Frontend + Backend (Pipeline boards, Products, Navbar)

## Context

Managers needed reliable board visibility edits, teammates needed near-live kanban updates without websockets, boards needed permanent delete (not only archive), Excel card import like products, accurate goal decomposition against the current progress period, easier public-shop product listing UX, product images in inventory/POS, and a cleaner mobile navbar.

## Decisions

1. **Visibility on edit (managers)**  
   `EditBoardModal` always shows `BoardVisibilitySection` for pipeline and project/personal boards. Managers (`can_manage_settings`) can change `team` / `private` / `shared` anytime; shared member list is sent on save.

2. **Visibility + role on lists**  
   `BoardListCard` optionally shows visibility and `current_member_role`. Pipeline boards list, estimates boards list, and the all-boards picker surface both badges. BE `resolveCurrentUserBoardMemberRole` now also resolves project-member and team-board roles (not only shared invites).

3. **30s poll when board is open**  
   `PIPELINE_KANBAN_POLL_MS` (and access/viewer/progress-related board polls) use **30_000** ms for all roles. No websockets for this release.

4. **Permanent board delete**  
   `DELETE /pipeline/boards/{id}` hard-deletes the board (cascades via FKs). UI: confirm dialog; default boards cannot be deleted. Archive control removed from board settings.

5. **Excel card/lead import (not columns)**  
   Minimal viable template: Title*, Stage*, Description, Contact Name/Email/Phone, Estimated Value, Due Date, Assignee Email, Priority.  
   - `GET /pipeline/boards/{id}/import-template`  
   - `POST /pipeline/boards/{id}/import`  
   FE: `BoardCardImportModal` (download template → upload), contributors+.

6. **Goal decomposition anchors**  
   FE sends `anchor_start` / `anchor_end` from the Progress period currently in view (`boardProgressAnchors.ts`), including custom ranges, so BE decomposition is based on that period.

7. **Product public shop**  
   Storefront listing state is kept locally after save and parent `editingProduct` is patched to avoid checkbox snap-back. Products table filter: all / listed / unlisted. Thumbnails on products table and POS New Sale search.

8. **Navbar business logo**  
   Logo (and building fallback icon) use `hidden md:block` — name remains on small screens; logo from tablet+.

## Failure states

| Flow | Failure / edge |
|------|----------------|
| Delete board | 403 if not manager; 422 if default board; confirm cancels with no change |
| Import | Per-row validation errors returned; partial import allowed; stage must match board columns |
| Visibility change | Non-managers see read-only section; save disabled |
| Poll | Stale UI at most ~30s; optimistic moves still apply locally |
| Storefront save | Online-only; inactive/disabled shop blocks listing |

## Alternatives considered

- Real-time websockets — deferred  
- Soft-delete boards — rejected; Oscar requested permanent delete with confirmation  
- Archive-only — replaced by delete for this product preference

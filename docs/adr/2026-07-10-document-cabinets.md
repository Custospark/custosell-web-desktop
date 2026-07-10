# ADR: Document cabinets

**Date:** 2026-07-10  
**Status:** Accepted  
**Scope:** Frontend + Backend (`documents` module)

## Context

The business file vault grew as a single flat tree per business. Teams need separate spaces (HR, Finance, Projects) with scoped ACL, similar to Pipeline boards.

## Decision

Introduce **Cabinets** as the top-level container for folders and files.

| Topic | Choice |
|-------|--------|
| User-facing name | **Cabinet** |
| Gallery route | `/documents` — cabinet cards (like Pipeline boards) |
| Explorer route | `/documents/cabinets/:id` — scoped explorer |
| In-explorer UX | Switch cabinet + New cabinet (Kanban-style picker) |
| Cabinet ACL | `all_staff` / `owner_only` / `selected_staff` + member roles (no `inherit`) |
| Folder/file ACL | Unchanged — `inherit` walks folder chain, then **cabinet ACL** |
| Precedence | Module gate → owner override → resource ACL (if not inherit) → folder chain → cabinet |
| Migration | Auto-create **General** (`all_staff`) per business; assign existing folders/files |
| Root files | Must belong to a cabinet (no loose business root) |
| Create cabinets | Any user with `documents` module |
| Delete cabinet | Block when folders or documents remain |
| Vault appearance | Business-wide (not per-cabinet in v1) |

## API

- `GET/POST /documents/cabinets`
- `GET/PATCH/DELETE /documents/cabinets/{id}`
- `GET /documents/folders/children` — **`cabinet_id` required**
- `GET /documents`, uploads, links, root folder create — accept `cabinet_id` for root-level writes
- `GET /documents/folders/tree?cabinet_id=` — optional cabinet filter for move tree

New businesses receive a **General** cabinet via `Business::created` → `DocumentCabinetService::ensureGeneralCabinet()`.

## Frontend

- `CabinetsPage` — gallery + search + create modal
- `DocumentsCabinetPage` — header switcher + `DocumentsPanel` scoped to `cabinetId`
- All explorer/list/upload/folder mutations pass `cabinet_id` at cabinet root

## Consequences

- **Breaking:** folder children endpoint requires `cabinet_id`; clients must update together with backend.
- Empty cabinets can be deleted; **General** may hold migrated legacy content.
- Embedded project/customer document panels fall back to the first accessible cabinet for root writes.

## Related

- [documents-module.md](../documents-module.md)
- [2026-07-10-documents-acl-and-folder-model.md](./2026-07-10-documents-acl-and-folder-model.md)

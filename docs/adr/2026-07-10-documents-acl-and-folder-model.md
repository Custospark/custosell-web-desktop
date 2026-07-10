# ADR: Documents ACL and folder model

**Date:** 2026-07-10  
**Status:** Accepted

## Context

Custosell needs a business-wide document vault with nested folders, staff-level permissions, and cross-module links (customers, projects). Pipeline board resources provide a flat `group_name` model but not hierarchical folders or live inheritance.

## Decision

1. **Hierarchical folders** via `document_folders.parent_id` with denormalized `depth` (max 5).
2. **Live ACL inheritance** — files/subfolders with `visibility: inherit` resolve effective permissions by walking the folder chain at read time (no copy-on-update).
3. **Roles:** `viewer`, `contributor`, `manager` (UI may say “collaborator” in prose; stored role is always `contributor`). Business owner and cabinet creator are always manager.
4. **`all_staff`** grants contributor capabilities to every active user with the `documents` module.
5. **Role matrix (cabinets / inherited content):**

| Capability | Viewer | Contributor | Manager |
|------------|--------|-------------|---------|
| Browse / download | Yes | Yes | Yes |
| Upload / new folder / link | No | Yes | Yes |
| Edit/delete own files | No | Yes | Yes |
| Edit/delete others’ files | No | No | Yes |
| Folder rename / move / access / delete | No | No | Yes |
| Cabinet settings / members / delete | No | No | Yes |

6. **`owner_only` (“Only me”)** — folder creator / document uploader retains manager on that item; other staff cannot view.
7. **Cascade delete** on folders (subfolders + files + disk cleanup).
8. **Online-only** — no offline queue for binary files.
9. **Module gating only** — no plan/subscription enforcement until monetization phase.

## Consequences

- `DocumentAccessService` is the single ACL brain (backend); API returns `can_*` flags for UI.
- Frontend must gate Upload / Folder / Link / drag-drop on `can_contribute` (including cabinet root — never hardcode `true`).
- Viewers see a read-only banner in the explorer (Pipeline-style).
- Frontend mirrors Pipeline patterns: `UserAvatar`, member stacks, attribution chips, Viewer/Contributor/Manager badges.
- Future: plan limits (`storage_mb`, `max_files`) can hook into upload path without changing ACL model.

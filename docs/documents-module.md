# Documents Module

Business-wide file vault for Custosell — nested folders, live ACL inheritance, tags, search, and cross-links to customers and projects.

## Access

- **Module slug:** `documents` (owner assigns via Settings → Module access / Staff drawer)
- **No billing gate** in v1 (pre-PMF)
- **Online-only** — uploads and browsing require connectivity

## Permissions

| Visibility | Meaning |
|------------|---------|
| `inherit` | Use parent folder ACL (files + subfolders) |
| `all_staff` | All staff with `documents` module (contributor-level) |
| `selected_staff` | Explicit members with viewer / contributor / manager roles |
| `owner_only` | Only me (visible only to you) |

Staff pickers load **all active business staff** via `GET /documents/accessible-members` (or Settings `useStaff()` when the user has Settings access). Inactive staff are excluded.

## Appearance

Vault canvas (gradient, solid color, or gallery photo) is stored per business:

- `GET/PATCH /documents/vault-appearance` — `cover_color`, `background_type`, `background_value`
- Folder accents: `cover_color` on `document_folders` (context menu → Folder color)
- Tag labels: `color` on `document_tags` (auto-assigned on create; shown as colored stripes/chips in explorer)

Explorer uses frosted-glass panels and pipeline-style gradient canvas (see `shared/utils/surfaceStyles.ts`).

**Scale:** See [ADR: Documents explorer scale](./adr/2026-07-10-documents-explorer-scale.md) — lazy tree + search work well to ~tens of thousands of items; millions require virtualization and cursor pagination (roadmap).

**Activity:** `GET /documents/activity` — vault-wide feed shown in collapsible explorer footer (VS Code–style).

**Access editing:** Context menu / detail pane → **Manage access** updates folder or file visibility and members via existing PATCH endpoints.

Business owner always has manager access. Live inheritance: changing a folder’s visibility or members immediately affects inheriting children.

## API (`/api/v1`)

See `Backend/routes/api/v1/documents.php`. Middleware: `auth:sanctum`, `business.active`, `module:documents`.

### Cabinets

- `GET/POST /documents/cabinets` — list (paginated) / create
- `GET/PATCH/DELETE /documents/cabinets/{id}` — show / update / delete (delete blocked if contents exist)
- Each business has a default **General** cabinet (`all_staff`); migration and `Business::created` ensure it exists
- Root folders, root uploads, and root links require `cabinet_id`

### Scalability (large vaults)

- `GET /documents?page=&per_page=&root_only=&cabinet_id=` — paginated document list (default 50, max 200); `root_only=true` returns only root-level files in the cabinet
- `GET /documents/folders/children?cabinet_id=&parent_id=&page=` — lazy-load folder tree nodes (**`cabinet_id` required**)
- `GET /documents/folders/{id}/contents?page=` — folder contents with paginated documents
- `GET /documents/folders/{id}/export` — zip download of folder + nested subfolders/files (links saved as `.url` shortcuts)
- `POST /documents/folders/{id}/email` — email zipped folder attachment
- `POST /documents/{id}/email` — email file attachment
- `GET /documents/{id}/content` — inline text/CSV/Word preview payload
- `PUT /documents/{id}/content` — save editable text file content
- `GET /documents/folders/tree?cabinet_id=` — tree for move modal (optional cabinet filter)

Staff with the `documents` module can create cabinets, root folders, and root links/files inside a cabinet (visibility cannot be `inherit` at root).

## Frontend

- Routes: `/documents` (cabinet gallery), `/documents/cabinets/:cabinetId` (explorer)
- Module path: `src/renderer/modules/documents/`
- Embedded panels: Project detail → Documents tab; Customer list → Documents link
- **Views:** list / grid toggle
- **Preview:** PDF, images, audio/video (≤10 MB), text/code, CSV tables, and Word (.docx) plain-text preview; inline edit for UTF-8 text/code/CSV (≤2 MB) via `GET/PUT /documents/{id}/content`
- **Drag to move:** Drag files and folders onto folder rows, breadcrumbs, or the cabinet root to move (with cycle prevention); folders auto-expand on drag-over
- **Path tooltips:** Hover a file in the explorer, tabs, or cards to see its full folder path (VS Code–style)
- **Move:** modal picker + drag-and-drop onto folders / current folder
- **Explorer:** VS Code-style two-pane layout with pipeline-inspired canvas (gradient/photo), frosted explorer, folder color accents, colored tag stripes, labeled actions, breadcrumbs, row context menus, **multi-tab file preview**, **Close file**, and **Import folder** (preserves directory tree via `webkitdirectory`)
- **Folder export:** context menu / detail pane → **Download folder** (zip)
- **Email share:** context menu / detail pane → **Email file** or **Email folder** (staff picker or external address; mirrors invoice email flow)
- **Long names:** middle-ellipsis display with full name on hover
- **Pagination:** load-more for document lists; sidebar loads folders on expand
- **Progress:** upload (axios) and download (XHR blob) progress bars

## Storage

Files stored on Laravel `public` disk under `business-documents/{business_id}/`. Max file size default: 100 MB. **Audio/video max: 10 MB** (`DOCUMENTS_MAX_MEDIA_FILE_SIZE_KB`). Inline text view/edit max: 2 MB (`DOCUMENTS_MAX_TEXT_CONTENT_SIZE_KB`). Max folder depth: **10** (`DOCUMENTS_MAX_DEPTH` / `DOCUMENTS_MAX_FOLDER_DEPTH` on frontend).

## Related ADR

- [2026-07-10-documents-acl-and-folder-model](./adr/2026-07-10-documents-acl-and-folder-model.md)
- [2026-07-10-document-cabinets](./adr/2026-07-10-document-cabinets.md)

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
| `owner_only` | Business owner only |

Business owner always has manager access. Live inheritance: changing a folder’s visibility or members immediately affects inheriting children.

## API (`/api/v1`)

See `Backend/routes/api/v1/documents.php`. Middleware: `auth:sanctum`, `business.active`, `module:documents`.

### Scalability (large vaults)

- `GET /documents?page=&per_page=` — paginated document list (default 50, max 200)
- `GET /documents/folders/children?parent_id=&page=` — lazy-load folder tree nodes (default 100)
- `GET /documents/folders/{id}/contents?page=` — folder contents with paginated documents
- `GET /documents/folders/tree` — full tree (kept for move modal / small vaults)

Staff with the `documents` module can create root folders and add links/files at root level (visibility cannot be `inherit` at root).

## Frontend

- Route: `/documents`
- Module path: `src/renderer/modules/documents/`
- Embedded panels: Project detail → Documents tab; Customer list → Documents link
- **Views:** list / grid toggle
- **Preview:** PDF and images in modal
- **Move:** modal picker + drag-and-drop onto folders / current folder
- **Rename:** files and folders via pencil action
- **Long names:** middle-ellipsis display with full name on hover
- **Pagination:** load-more for document lists; sidebar loads folders on expand
- **Progress:** upload (axios) and download (XHR blob) progress bars

## Storage

Files stored on Laravel `public` disk under `business-documents/{business_id}/`. Max file size default: 100 MB. Max folder depth: 5.

## Related ADR

- [2026-07-10-documents-acl-and-folder-model](./adr/2026-07-10-documents-acl-and-folder-model.md)

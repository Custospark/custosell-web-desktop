# Pipeline module

Online-first sales pipeline (CRM-lite) for lead tracking, kanban boards, and customer conversion.

## Routes

| Path | Page |
|------|------|
| `/pipeline/boards` | Board gallery |
| `/pipeline/boards/:id` | Kanban + calendar view (toggle in header) |
| `/pipeline/my-work` | Leads assigned to current user |
| `/pipeline/leads` | All leads table |
| `/pipeline/insights` | Summary metrics |
| `/pipeline/settings` | Lead sources CRUD + board overview |

## Board features

- **Kanban / Calendar** — Calendar shows leads by `expected_close_date` for the active board.
- **Board settings** — Gear icon on board header: edit name, description, color, visibility; archive (non-default boards).
- **Columns** — Add column, edit (rename, color, reorder), delete with lead migration when column has cards.
- **Lead drawer** — Edit title, expected close date, contact fields; archive lead.

## Settings

- Custom lead sources: add, rename, delete (system sources are read-only).
- Board list links into each board for column/archive management.

## API endpoints (added)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/pipeline/boards/{id}/calendar?year=&month=` | Leads grouped by close date |
| `DELETE` | `/pipeline/stages/{id}` | Delete column (`migrate_to_stage_id` if leads present) |
| `DELETE` | `/pipeline/leads/{id}` | Archive (soft-delete) lead |
| `POST/PATCH/DELETE` | `/pipeline/sources` | Custom source CRUD |

## API

Base: `GET/POST /api/v1/pipeline/*` — see `Backend/routes/api/v1/pipeline.php`.

## Notes

- Requires `pipeline` business module on staff accounts.
- No offline queue or IndexedDB sync in v1 (online collaboration only).
- Lead convert uses `CustomerContactService::resolve` on the backend.

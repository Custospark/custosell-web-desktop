# Pipeline module

Online-first sales pipeline (CRM-lite) for lead tracking, kanban boards, and customer conversion.

## Routes

| Path | Page |
|------|------|
| `/pipeline/boards` | Board gallery |
| `/pipeline/boards/:id` | Kanban view |
| `/pipeline/my-work` | Leads assigned to current user |
| `/pipeline/leads` | All leads table |
| `/pipeline/insights` | Summary metrics |
| `/pipeline/settings` | Sources and board overview |

## API

Base: `GET/POST /api/v1/pipeline/*` — see `Backend/routes/api/v1/pipeline.php`.

## Notes

- Requires `pipeline` business module on staff accounts.
- No offline queue or IndexedDB sync in v1 (online collaboration only).
- Lead convert uses `CustomerContactService::resolve` on the backend.

# Estimates & Projects module

Enterprise project estimates, costing, proposals, job delivery, and profitability — online-only, internal staff use.

## Scope

| Area | Routes (API) | Frontend |
|------|----------------|----------|
| Estimates | `/api/v1/estimates/*` | `/estimates` |
| Projects | `/api/v1/projects/*` | `/estimates/projects` |
| Analytics | `GET /estimates/analytics` | `/estimates/insights` |
| Templates | `/api/v1/estimate-templates/*` | `/estimates/templates` |

Module slug: **`estimates`** (covers estimates + projects nav).

## Integrations

| Module | Link |
|--------|------|
| **Customers** | `estimates.customer_id` |
| **Pipeline** | `estimates.pipeline_lead_id`, `pipeline_leads.estimate_id` |
| **Invoices** | `invoices.estimate_id`; convert creates draft invoice |
| **Accounting** | No GL on estimate send; invoice send uses existing `InvoiceSentForAccounting` |
| **Inventory** | Optional `product_id` on estimate line items |
| **Expenses** | `project_cost_allocations.expense_id` for indirect cost allocation |

## Estimate lifecycle

```
draft → sent → approved | rejected
approved → converted (invoice and/or project)
```

- **Send** snapshots a version in `estimate_versions` (no accounting posting).
- **Convert to invoice** creates a draft invoice with line items from billable estimate lines.
- **Convert to project** creates a project with budget from estimate totals.

## Costing

Line items support `unit_cost`, markup (`percent` | `fixed` | `none`), and computed `unit_price`, `total_cost`, `total_price`.

Estimate header stores `cost_subtotal`, `gross_profit`, `margin_percent`.

Projects track `budget_cost` / `budget_revenue` vs `actual_cost` / `actual_revenue` from timesheets and cost allocations.

## Permissions

Module access: `estimates` on staff user `modules` JSON.

Permission keys (mapped to module): `estimates.view`, `estimates.create`, `estimates.send`, `estimates.approve`, `estimates.convert`, `estimates.delete`, `projects.view`, `projects.manage`, `projects.timesheet`.

## Offline

Online-only — no IndexedDB queue or sync replay for estimates/projects.

## Key backend files

- `app/Services/EstimateService.php`
- `app/Services/ProjectService.php`
- `app/Services/EstimatePdfBuilder.php`
- `routes/api/v1/estimates.php`, `projects.php`

## Key frontend files

- `src/renderer/modules/estimates/`
- Pipeline: `CreateEstimateFromLeadButton` in lead drawer

# Custosell documentation

Technical documentation for the Custosell frontend (Electron + React + TypeScript), with emphasis on **offline-first retail** for businesses in unreliable connectivity environments.

## Quick start

| If you need… | Start here |
|--------------|------------|
| Sales pitch / closing the deal | [product/sales-faq.md](./product/sales-faq.md) |
| Offline system overview | [offline/architecture.md](./offline/architecture.md) |
| Login, reconnect, 401 fix | [offline/auth.md](./offline/auth.md) |
| Manual test plan | [offline/testing.md](./offline/testing.md) |
| Source code folder map | [../src/renderer/app/store/offline/README.md](../src/renderer/app/store/offline/README.md) |

---

## Offline platform

See [offline/README.md](./offline/README.md) for the full offline doc index.

| Document | Contents |
|----------|----------|
| [architecture.md](./offline/architecture.md) | IndexedDB schema (v12), connectivity, reconnect pipeline |
| [architecture-diagram.ipynb](./offline/architecture-diagram.ipynb) | Supplementary mermaid diagrams (notebook) |
| [auth.md](./offline/auth.md) | Device login, silent session upgrade, API gating |
| [sales.md](./offline/sales.md) | POS, shifts, refunds, sales catalog snapshots |
| [inventory.md](./offline/inventory.md) | Products, categories, customers, stock ledger |
| [expenses.md](./offline/expenses.md) | Expenses and expense categories |
| [settings.md](./offline/settings.md) | Roles, staff, business settings |
| [guide.md](./offline/guide.md) | Guide feedback offline queue |
| [testing.md](./offline/testing.md) | Manual tests and troubleshooting |
| [readiness.md](./offline/readiness.md) | Boutique / unreliable-internet assessment |
| [changelog.md](./offline/changelog.md) | Major offline platform changes |

## Application

| Document | Contents |
|----------|----------|
| [shell.md](./app/shell.md) | Status banners, navbar, layout chrome |
| [service-worker.md](./app/service-worker.md) | Web production caching (static + API GET) |
| [referral/README.md](./referral/README.md) | Referral & commission system |
| [vera-logic.md](./vera-logic.md) | Vera Logic — repo rules & contracts gate (`npm run vera:logic`) |

## Compliance

| Document | Contents |
|----------|----------|
| [efris-setup.md](./compliance/efris-setup.md) | URA EFRIS credentials, `.env` flag, sandbox/pilot, implementation status + queue worker |

## Platform & product

| Document | Contents |
|----------|----------|
| [desktop-release.md](./platform/desktop-release.md) | Electron desktop builds |
| [estimates-module.md](./estimates-module.md) | Project estimates, costing, projects, job delivery |
| [documents-module.md](./documents-module.md) | Business file vault — folders, ACL, tags, cross-module links |
| [design-system.md](./product/design-system.md) | Colors, typography, UI patterns |
| [sales-conversation.ipynb](./product/sales-conversation.ipynb) | Sales role-play simulator (GTM) |
| [intent-and-tour.md](./product/intent-and-tour.md) | Post-register intent cards + shell product tour |
| [subscription-user-stories.md](./product/subscription-user-stories.md) | Frontend subscription guard, overlay, user stories per status |
| [billing-currency.md](./product/billing-currency.md) | Multi-currency pricing display, payment currency routing, backend validation |

## Forensic / accuracy audits

| Document | Contents |
|----------|----------|
| [subscription-payment-audit.md](./forensic/subscription-payment-audit.md) | Prior subscription/payment C/H/M/L audit (critical, high, medium, low gaps) |
| [subscription-amount-accuracy.md](./forensic/subscription-amount-accuracy.md) | Master scenario doc — every subscription/payment action, amounts shown vs sent, credits, proration, rewards + real-number test matrix |

## Future work

| Document | Contents |
|----------|----------|
| [offline-npm-library.ipynb](./future-work/offline-npm-library.ipynb) | Plan to extract `@opiyo/offline-core` npm package |

## Team

| Document | Contents |
|----------|----------|
| [agents-playbook.ipynb](./team/agents-playbook.ipynb) | Custospark team orchestration playbook (`AGENTS.md` companion) |

## Architecture decisions (ADR)

| Document | Contents |
|----------|----------|
| [2026-07-27-businessQueries-subscription-overwrite-gate-fix.md](./adr/2026-07-27-businessQueries-subscription-overwrite-gate-fix.md) | `useBusiness` subscription overwrite → gate redirect loop after onboarding payment |
| [2026-07-25-subscription-persistence-businessQueries-overwrite.md](./adr/2026-07-25-subscription-persistence-businessQueries-overwrite.md) | BusinessQueries `setBusiness` overwrite — subscription drop on `GET /businesses/mine` |
| [2026-07-04-accounting-module-architecture.md](./adr/2026-07-04-accounting-module-architecture.md) | Double-entry accounting module |
| [2026-07-08-pipeline-board-member-roles.md](./adr/2026-07-08-pipeline-board-member-roles.md) | Pipeline board viewer / contributor / manager roles |
| [2026-07-08-staff-drawer-module-access-parity.md](./adr/2026-07-08-staff-drawer-module-access-parity.md) | Staff drawer module access matches Module Access; owner email read-only |
| [2026-07-14-owner-module-toggles-no-staff-revoke.md](./adr/2026-07-14-owner-module-toggles-no-staff-revoke.md) | Owner personal module off does not strip staff grants |
| [2026-07-14-board-card-import-sample-formats.md](./adr/2026-07-14-board-card-import-sample-formats.md) | Board Excel import sample dates/values; optional assignee email |
| [2026-07-14-day-weighted-horizon-decomposition.md](./adr/2026-07-14-day-weighted-horizon-decomposition.md) | Day-weighted decade/year cascade; cumulative + horizon expected |
| [2026-07-08-board-progress-targets.md](./adr/2026-07-08-board-progress-targets.md) | Board Progress canvas, targets/OKRs, pipeline vs project language |
| [2026-07-08-progress-decomposition-engine.md](./adr/2026-07-08-progress-decomposition-engine.md) | Column-aware metrics, hybrid goal decomposition, planning hierarchy |
| [2026-07-10-documents-acl-and-folder-model.md](./adr/2026-07-10-documents-acl-and-folder-model.md) | Documents module ACL, live inheritance, folder tree |
| [2026-07-10-documents-explorer-scale.md](./adr/2026-07-10-documents-explorer-scale.md) | Explorer scale limits and enterprise roadmap |
| [2026-07-10-document-cabinets.md](./adr/2026-07-10-document-cabinets.md) | Document cabinets — gallery, scoped explorer, cabinet ACL |
| [2026-07-10-hr-payroll-module.md](./adr/2026-07-10-hr-payroll-module.md) | HR & Payroll module — people, leave, Uganda payroll |
| [2026-07-10-hr-full-module-access.md](./adr/2026-07-10-hr-full-module-access.md) | `hr_full` addon — limited vs full HR workspace |
| [2026-07-10-hr-work-performance-from-pipeline.md](./adr/2026-07-10-hr-work-performance-from-pipeline.md) | Evaluate employees from Pipeline/Projects goals & tasks |
| [2026-07-10-hr-payroll-accounting-bridge.md](./adr/2026-07-10-hr-payroll-accounting-bridge.md) | Fail-hard payroll post, split liabilities, settle/remit/void |
| [2026-07-10-product-vs-service-sales.md](./adr/2026-07-10-product-vs-service-sales.md) | Product vs service catalog — stock skip, revenue 4100/4200 |
| [2026-07-10-payroll-affordability-cash-runway.md](./adr/2026-07-10-payroll-affordability-cash-runway.md) | Payroll cash check, N-month runway, hire what-if |
| [2026-07-11-forecasting-module.md](./adr/2026-07-11-forecasting-module.md) | Financial Forecasting FE — cash, BvA, budgets, KPIs, scenarios |
| [2026-07-11-stock-movement-actor-attribution.md](./adr/2026-07-11-stock-movement-actor-attribution.md) | Stock History shows logged-in user; BE `created_by` + backfill |
| [2026-07-11-navbar-module-launcher.md](./adr/2026-07-11-navbar-module-launcher.md) | Navbar Apps modal — per-user module switcher |
| [2026-07-11-hr-overview-dashboard.md](./adr/2026-07-11-hr-overview-dashboard.md) | Full-access HR dashboard at `/hr/overview` |
| [2026-07-11-pos-orders-persistence.md](./adr/2026-07-11-pos-orders-persistence.md) | POS Hold/Take orders persist to DB; open→completed→invoiced |
| [2026-07-11-inventory-supply-chain-b2b.md](./adr/2026-07-11-inventory-supply-chain-b2b.md) | B2B marketplace + purchase orders (online-only, opt-in listings) |
| [2026-07-11-po-accept-auto-invoice.md](./adr/2026-07-11-po-accept-auto-invoice.md) | Accept PO → shared seller invoice + buyer receipts via Invoices |
| [2026-07-11-supplier-invoices-seller-payments.md](./adr/2026-07-11-supplier-invoices-seller-payments.md) | Seller-only payments; Sales vs Supplier invoices; in-place PO view |
| [2026-07-11-buyer-ap-supplier-invoice-automation.md](./adr/2026-07-11-buyer-ap-supplier-invoice-automation.md) | Buyer AP + inventory/expense JEs mirrored from shared B2B invoices |
| [2026-07-11-supplier-party-receive-create-payment-counts.md](./adr/2026-07-11-supplier-party-receive-create-payment-counts.md) | Supplier party labels; receive create-product; PO payment counts |
| [2026-07-11-document-letterhead-issuer-not-viewer.md](./adr/2026-07-11-document-letterhead-issuer-not-viewer.md) | Invoice/receipt letterhead = seller issuer; Customer = buyer |
| [2026-07-11-offline-disable-online-only-modules.md](./adr/2026-07-11-offline-disable-online-only-modules.md) | Grey out online-only nav when offline; banner if already on page |
| [2026-07-11-intent-and-app-tour.md](./adr/2026-07-11-intent-and-app-tour.md) | Owner intent + app-wide tour; never auto-set modules |
| [2026-07-11-marketplace-supplier-list.md](./adr/2026-07-11-marketplace-supplier-list.md) | Per-business My suppliers shortlist (FE+BE) |
| [2026-07-11-company-assets-hr-accounting.md](./adr/2026-07-11-company-assets-hr-accounting.md) | Company Assets (HR custody) ↔ Fixed Assets (Accounting) |
| [2026-07-12-efris-fiscalization.md](./adr/2026-07-12-efris-fiscalization.md) | URA EFRIS — API, both POS+invoices, sync-later, master flag |
| [2026-07-12-custosell-business-os-brand.md](./adr/2026-07-12-custosell-business-os-brand.md) | Tagline: Your Business Operating System; auth/shell + landing |
| [2026-07-12-public-storefront.md](./adr/2026-07-12-public-storefront.md) | Public `/@slug` shops + Discover; order requests → Orders |
| [2026-07-12-storefront-multi-cart-submit-auth.md](./adr/2026-07-12-storefront-multi-cart-submit-auth.md) | Multi-business cart bags + submit-time sign-in |
| [2026-07-12-storefront-shop-contact-and-ratings.md](./adr/2026-07-12-storefront-shop-contact-and-ratings.md) | Shop contact fields + product star ratings; instant Discover tabs |
| [2026-07-12-discover-shop-under-discover-path.md](./adr/2026-07-12-discover-shop-under-discover-path.md) | Strip blank-main bug autopsy; `/discover/shop/:slug`; place-order → orders count |
| [2026-07-12-storefront-qr-download.md](./adr/2026-07-12-storefront-qr-download.md) | Downloadable PNG QR from Public shop settings + shop page |
| [2026-07-12-storefront-polish-gaps.md](./adr/2026-07-12-storefront-polish-gaps.md) | Categories, Online filter, cancel/delete, stock, detail, QR lib, delivery, notify |
| [2026-07-12-storefront-wishlist.md](./adr/2026-07-12-storefront-wishlist.md) | Heart save-for-later; local wishlist page + merge on sign-in |
| [2026-07-12-storefront-buyer-customer-accounts.md](./adr/2026-07-12-storefront-buyer-customer-accounts.md) | Discover create-account default; buyer → seller Customer on order |
| [2026-07-12-storefront-buyer-receipts-invoices.md](./adr/2026-07-12-storefront-buyer-receipts-invoices.md) | B2C My Orders → sale receipt / invoice (reuse POS modals) |
| [2026-07-12-storefront-buyer-doc-letterhead.md](./adr/2026-07-12-storefront-buyer-doc-letterhead.md) | Buyer receipts/invoices/PDF use shop name, not Custosell |
| [2026-07-12-storefront-buyer-phone-and-order-eye.md](./adr/2026-07-12-storefront-buyer-phone-and-order-eye.md) | Persist delivery phone for reorders; Eye → line items on My Orders |
| [2026-07-12-product-percent-discounts.md](./adr/2026-07-12-product-percent-discounts.md) | Product `discount_percent`; storefront struck sale prices; place-order uses effective price |
| [2026-07-12-unified-receipt-action-bar.md](./adr/2026-07-12-unified-receipt-action-bar.md) | Receipt footers: Download PDF · Print · More (shared `ReceiptActionBar`) |
| [2026-07-12-cors-cross-browser-preflight.md](./adr/2026-07-12-cors-cross-browser-preflight.md) | CORS preflight fails on Edge/Firefox; `www.` subdomain + explicit origin vs pattern |
| [2026-07-13-pipeline-board-seeds-and-owner-module-catalog.md](./adr/2026-07-13-pipeline-board-seeds-and-owner-module-catalog.md) | Board gallery underpaint; owner modules-only save; one-time legacy module grant |
| [2026-07-13-staff-detach-attach.md](./adr/2026-07-13-staff-detach-attach.md) | Org Detach/Attach replaces staff delete/deactivate; email lookup |
| [2026-07-13-module-access-and-landing-mobile-tabs.md](./adr/2026-07-13-module-access-and-landing-mobile-tabs.md) | Module Access launcher tiles; landing native mobile bottom tabs |
| [2026-07-14-auth-mobile-bottom-tabs.md](./adr/2026-07-14-auth-mobile-bottom-tabs.md) | Auth shell Menu / pin / More bottom tabs; hamburger → Menu on mobile |
| [2026-07-13-hr-people-edit-table-pagination.md](./adr/2026-07-13-hr-people-edit-table-pagination.md) | HR People: lock email/password on edit; Table + pagination; list detach |
| [2026-07-13-staff-form-modal-module-hydrate.md](./adr/2026-07-13-staff-form-modal-module-hydrate.md) | Staff edit Modal; GET detail to hydrate module checkboxes |
| [2026-07-14-board-poll-delete-import-storefront.md](./adr/2026-07-14-board-poll-delete-import-storefront.md) | Board 30s poll, delete, Excel card import, visibility/role, product shop UX |
| [2026-07-14-order-lists-30s-poll.md](./adr/2026-07-14-order-lists-30s-poll.md) | PO / Incoming / Sales / Storefront order lists poll every 30s when open |
| [2026-07-18-data-export-and-account-deletion.md](./adr/2026-07-18-data-export-and-account-deletion.md) | Business data export API + self-service account deletion |
| [2026-07-26-multi-currency-exchange-rate.md](./adr/2026-07-26-multi-currency-exchange-rate.md) | Multi-currency pricing & payment routing — USD-primary display, payment currency selection, backend validation |
| [2026-07-26-upgrade-flow-proration.md](./adr/2026-07-26-upgrade-flow-proration.md) | Upgrade flow fix — proration display, metadata validation, cross-stack |
| [2026-07-31-full-price-minus-credit-plan-changes.md](./adr/2026-07-31-full-price-minus-credit-plan-changes.md) | Unified plan-change rule — charge full new plan price, deduct unused credit, reset billing period |
| [2026-08-01-product-modal-inline-add-category.md](./adr/2026-08-01-product-modal-inline-add-category.md) | Inline "Add Category" in product modal; category drawer converted to standard modal |
| [2026-08-01-product-listing-bulk-and-row-actions.md](./adr/2026-08-01-product-listing-bulk-and-row-actions.md) | Product bulk List/Unlist actions (shop + supply) and per-row Actions menu |
| [2026-08-01-product-list-supply-filter-and-dropdown-fix.md](./adr/2026-08-01-product-list-supply-filter-and-dropdown-fix.md) | Supply listing filter + badge, responsive bulk bar, un-clipped row actions menu |

## Modules

| Document | Contents |
|----------|----------|
| [modules/pipeline-progress.md](./modules/pipeline-progress.md) | Board Progress v2 — columns, decomposition, My progress, export |
| [modules/hr.md](./modules/hr.md) | HR & Payroll — routes, API layer, payroll flow, failure states |
| [modules/forecasting.md](./modules/forecasting.md) | Forecasting — cash runway, budgets, KPIs, scenarios |
| [modules/inventory-supply-chain.md](./modules/inventory-supply-chain.md) | B2B marketplace, purchase/incoming orders, receive mapping |
| [modules/storefront.md](./modules/storefront.md) | Public shops, Discover, multi-cart, submit-time auth → Orders |
| [modules/data-export.md](./modules/data-export.md) | Data & Export page, export API, business account self-deletion |

## Key source locations

| Area | Path |
|------|------|
| Offline code index | `src/renderer/app/store/offline/README.md` |
| IndexedDB schema | `src/renderer/app/store/offline/core/offlineDb.ts` |
| Mutation queue | `src/renderer/app/store/offline/sync/mutationQueue.ts` |
| Sync engine | `src/renderer/app/store/offline/sync/syncEngine.ts` |
| Sync coordinator | `src/renderer/app/store/offline/sync/syncCoordinator.ts` |
| Catalog snapshots | `src/renderer/app/store/offline/catalogs/` |
| Session upgrade | `src/renderer/app/store/offline/auth/sessionUpgrade.ts` |
| Reconnect hook | `src/renderer/app/store/hooks/useOfflineSync.ts` |
| Network probe | `src/renderer/app/store/network/connectivityCheck.ts` |

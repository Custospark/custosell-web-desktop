/**
 * Landing-page SEO content — human-rich, keyword-relevant sections and FAQ
 * answers rendered on the live page so both search crawlers and AI agents
 * read real copy (not just keyword pills). Kept in one place for sanity.
 *
 * Keep the module names + descriptions aligned with `../landing/landingModules.ts`
 * and `src/renderer/shared/brand/custosellBrand.ts` (SUPPORTING_LINE).
 */

export interface FeatureSeo {
  anchor: string;
  heading: string;
  subtitle: string;
  paragraphs: string[];
  points: string[];
}

export const FEATURE_SEO: FeatureSeo[] = [
  {
    anchor: 'point-of-sale-pos',
    heading: 'Point of Sale (POS) software for retail, restaurants, and services',
    subtitle: 'Ring sales fast, take payments, and close shifts without the chaos.',
    paragraphs: [
      'Custosell is powerful Point of Sale software that turns a computer, tablet, or phone into a complete checkout counter. Cashiers ring up sales, apply discounts, choose payment methods (cash, card, escrow payment), and print or share receipts in seconds.',
      'Because Custosell is offline-first, sales keep flowing even when the internet drops. Open a shift, record every transaction against the right register and staff member, then close with a clear cash-at-handover report. It is built for busy shop floors that cannot afford downtime.',
    ],
    points: [
      'Quick, tab-friendly checkout with a full keyboard flow',
      'Shift management with per-staff registers and close reports',
      'Receipt printing and electronic sharing',
      'Offline-first — keeps selling when the network is down',
      'Automatic sync to accounting and inventory when back online',
    ],
  },
  {
    anchor: 'accounting',
    heading: 'Accounting and bookkeeping software for small businesses',
    subtitle: 'Books you can trust, with numbers ready when you need them.',
    paragraphs: [
      'Custosell bundles Accounting software with your daily Point of Sale, so your books are built from the sales you actually make. Log expenses, track payables and receivables, and see profit-and-loss numbers without copying data between apps.',
      'Every sale, expense, invoice, and payment feeds the same ledger. You get a connected picture of cash flow and financial health, ready for tax season or a partnership conversation.',
    ],
    points: [
      'Profit and loss that updates in near-real time from real transactions',
      'Expense tracking that stops money leaking out unseen',
      'Payables and receivables shared with invoicing',
      'Financial forecasting to plan before you commit',
      'No more rebuilding books in spreadsheets',
    ],
  },
  {
    anchor: 'inventory-supply-chain',
    heading: 'Inventory and supply chain management software',
    subtitle: 'Never guess stock again — track products and keep the shelves right.',
    paragraphs: [
      'Custosell inventory and supply chain software keeps a live count of every product you hold. Sales from your POS and storefront reduce stock automatically, and you can raise purchase orders to suppliers, track their fulfillment, and record receipt.',
      'Stock stays connected whether a sale happens at the counter or online. You always know what to reorder, what is moving, and what is sitting on the shelf.',
    ],
    points: [
      'Automatic stock deduction from POS and storefront sales',
      'Product catalog with categories, pricing, and variants',
      'Purchase orders, supplier, and fulfillment tracking',
      'Visibility across branches and registers',
      'Reorder insight to keep the shelves right',
    ],
  },
  {
    anchor: 'hr-payroll',
    heading: 'HR and payroll software for growing teams',
    subtitle: 'Pay people on time without spreadsheet stress.',
    paragraphs: [
      'Custosell growing teams with HR and payroll software: attendance, leave, and payroll in one place. Control who has access to what in the system, and keep team records organized.',
      'After alone as your team grows, because payroll is tied to the same platform you already use to run sales and inventory.',
    ],
    points: [
      'Attendance and leave tracking for staff',
      'Payroll runs without spreadsheet errors',
      'Role-based access so people see only what they need',
      'Staff and business records in one connected system',
    ],
  },
  {
    anchor: 'ecommerce-storefront',
    heading: 'E-commerce storefront and catalog software',
    subtitle: 'Sell online from the same catalog you run at the counter.',
    paragraphs: [
      'Turn your business into e-commerce with a Custosell storefront. Share a public shop link so customers browse your catalog, save wishlists, place order requests, and track status — all while stock stays tied to your real inventory.',
      'Because the storefront reads the same inventory as your POS, there is no separate database to reconcile. Every online order makes room into the shelves automatically.',
    ],
    points: [
      'Public shop link your customers can browse',
      'Wishlists, order requests, and status tracking',
      'Stock stays in sync with the POS catalog',
      'Built for businesses without a website team',
    ],
  },
  {
    anchor: 'crm-sales-pipeline',
    heading: 'Sales pipeline and CRM software',
    subtitle: 'Close more deals. Move leads across boards so nothing slips.',
    paragraphs: [
      'Custosell includes a sales pipeline and CRM to manage Leads, opportunities, and follow-ups across simple boards. Track every deal in one place and pick up conversations the moment customers return.',
      'Customer records hold contact history and purchase history, so your team has context at the last word.',
    ],
    points: [
      'Kanban-style pipeline for your sales deals',
      'Customer contacts, history, and follow-ups in one list',
      'Shared context so the whole team sees the same customer',
    ],
  },
  {
    anchor: 'project-management',
    heading: 'Project and productivity management software',
    subtitle: 'Quote, deliver, and get paid. Run estimates and projects from first ask to done.',
    paragraphs: [
      'Custosell includes project and productivity tools for businesses that deliver work — quotes, estimates, and project boards that take a job from the first customer request to a finished, paid delivery.',
      'Because projects live beside invoicing and expense tracking, you can quote a job, track the hours and costs against it, and send an invoice the moment it is done.',
    ],
    points: [
      'Estimates and quotes that turn into projects',
      'Boards to keep tasks and deadlines visible',
      'Project costs and revenue tied to your books',
      'Invoicing connected to completed work',
    ],
  },
  {
    anchor: 'expenses',
    heading: 'Expense tracking software',
    subtitle: 'Stop money leaking. Log spending and see where cash really goes.',
    paragraphs: [
      'Expense tracking in Custosell helps you record spending as it happens and see where every shilling goes. Categories and reports make it easy to spot overspending before it becomes a problem.',
      'Paid from a store shift, expenses connect with the shift report so the books stay balanced.',
    ],
    points: [
      'Quick expense logging at the point of purchase',
      'Categories and monthly spending reports',
      'Shift expenses reconciled into close reports',
    ],
  },
  {
    anchor: 'financial-forecasting',
    heading: 'Financial forecasting software',
    subtitle: 'Plan ahead with confidence before you commit.',
    paragraphs: [
      'Financial forecasting in Custosell turns your recorded history into a forward-looking cash outlook and what-if scenarios, so you can plan hires, orders, and growth with more confidence.',
      'Forecasts pull from real sales and expense data instead of gut feel.',
    ],
    points: [
      'Cash-flow outlook built from real records',
      'What-if scenarios before big decisions',
      'Dashboards that connect sales, costs, and a P&L',
    ],
  },
  {
    anchor: 'document-management',
    heading: 'Document management',
    subtitle: 'Find any file fast — contracts, invoices, and records in one place.',
    paragraphs: [
      'Document management in Custosell keeps contracts, invoices, quotations, and records organized for the team, so the right file is clear when you need it.',
    ],
    points: [
      'Central document storage for the whole team',
      'Records linked to customers, jobs, and invoices',
      'Searchable without digging through folders',
    ],
  },
];

export interface SeoFaq {
  question: string;
  answer: string;
}

export const SEO_FAQ: SeoFaq[] = [
  {
    question: 'What is Custosell?',
    answer:
      'Custosell is your Business Operating System — Point of Sale, E-commerce Storefront, Inventory & Supply Chain, Accounting, HR & Payroll, Invoicing, Expenses, Project Management, Sales Pipeline (CRM), Financial Forecasting, and Document Management in one connected system that works with or without the internet.',
  },
  {
    question: 'Does Custosell work offline?',
    answer:
      'Yes. Custosell is offline-first. You can keep selling, recording payments, and managing inventory even when the network is down, and everything syncs automatically when you reconnect.',
  },
  {
    question: 'Is Custosell accounting software too?',
    answer:
      'Custosell has an accounting built in, and it is based on your real sales and expenses, so profit-and-loss and cash flow come from what actually happened — no separate bookkeeping app needed.',
  },
  {
    question: 'Can I use Custosell for a retail store POS?',
    answer:
      'Custosell is a full Point of Sale for retail, restaurants, and service businesses. You can ring sales, take payments, manage shifts, print receipts, and keep inventory in line all in one system.',
  },
  {
    question: 'How does Custosell handle inventory across an online storefront?',
    answer:
      'Custosell connects your storefront, so online orders and POS sales both reduce the same stock count automatically. It also supports purchase orders and supplier, creating a complete supply chain view.',
  },
  {
    question: 'Does Custosell include project management?',
    answer:
      'Yes. Custosell includes project and productivity tools — estimates, quotes, and project boards that take a job from first request to paid delivery, with costs and invoicing connected to your books.',
  },
  {
    question: 'Who makes Custosell?',
    answer:
      'Custosell is a product of Custospark Company Ltd — a software team that helps business owners run retail, restaurants, hotels, and services with one connected system.',
  },
];
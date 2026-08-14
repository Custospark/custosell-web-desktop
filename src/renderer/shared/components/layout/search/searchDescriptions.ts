import { ROUTES } from '../../../../app/routes/constants/shared.paths';

/**
 * Human-readable one-liners for every sidebar page, used both as the result
 * description (never the URL) and as searchable terms - mirroring Custocare's
 * `SearchableModule.description` standard.
 */
export const NAV_ITEM_DESCRIPTIONS: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Your business performance at a glance.',

  [ROUTES.SALES.NEW]: 'Start a new sale and capture items quickly.',
  [ROUTES.SALES.ORDERS]: 'Manage open and recent sales orders.',
  [ROUTES.SALES.HISTORY]: 'Browse your complete sales history.',
  [ROUTES.SALES.REFUNDS]: 'Process refunds for past sales.',
  [ROUTES.SALES.MY_SHIFT]: 'Clock in, review your shift, and end it.',
  [ROUTES.INVOICES.INDEX]: 'Create and manage invoices for customers.',

  [ROUTES.INVENTORY.OVERVIEW]: 'Inventory and stock summary at a glance.',
  [ROUTES.INVENTORY.PRODUCTS]: 'Manage your product catalog and prices.',
  [ROUTES.INVENTORY.CATEGORIES]: 'Organize products into categories.',
  [ROUTES.INVENTORY.STOCK]: 'Track stock levels and ledger movements.',
  [ROUTES.INVENTORY.MARKETPLACE]: 'Buy and sell stock on the marketplace.',
  [ROUTES.INVENTORY.PURCHASE_ORDERS]: 'Create and manage supplier purchase orders.',
  [ROUTES.INVENTORY.INCOMING_ORDERS]: 'Receive and review incoming stock orders.',
  [ROUTES.INVOICES.SUPPLIER]: 'Manage invoices from your suppliers.',

  [ROUTES.CUSTOMERS.OVERVIEW]: 'Customer insights, segments, and trends.',
  [ROUTES.CUSTOMERS.INDEX]: 'Search, add, and manage your customers.',

  [ROUTES.DISCOVER]: 'Discover shops and place orders online.',
  [ROUTES.DISCOVER_MY_ORDERS]: 'Track orders you have placed online.',

  [ROUTES.PIPELINE.BOARDS]: 'Organize and track work on kanban boards.',
  [ROUTES.PIPELINE.MY_WORK]: 'Your assigned tasks across boards.',
  [ROUTES.PIPELINE.LEADS]: 'Manage every lead in your pipeline.',
  [ROUTES.PIPELINE.INSIGHTS]: 'Pipeline performance and conversion analytics.',
  [ROUTES.PIPELINE.SETTINGS]: 'Configure pipeline stages and settings.',
  [ROUTES.PIPELINE.REFERRALS]: 'Track referrals and your reward program.',

  [ROUTES.ESTIMATES.INDEX]: 'Create and manage estimates for customers.',
  [ROUTES.ESTIMATES.PROJECTS]: 'Track projects and their progress.',
  [ROUTES.ESTIMATES.BOARDS]: 'Visualize project tasks on boards.',
  [ROUTES.ESTIMATES.INSIGHTS]: 'Estimates and project performance analytics.',
  [ROUTES.ESTIMATES.TEMPLATES]: 'Reusable estimate templates.',

  [ROUTES.EXPENSES.OVERVIEW]: 'Income and expense summary at a glance.',
  [ROUTES.EXPENSES.INCOME]: 'Record and review business income.',
  [ROUTES.EXPENSES.BUDGETS]: 'Plan and track spending budgets.',
  [ROUTES.EXPENSES.LIST]: 'Review all recorded expenses.',
  [ROUTES.EXPENSES.CATEGORIES]: 'Organize expenses into categories.',

  [ROUTES.DOCUMENTS.INDEX]: 'Store and organize business documents.',

  [ROUTES.HR.OVERVIEW]: 'Workforce overview and HR metrics.',
  [ROUTES.HR.PEOPLE]: 'Manage employees and their records.',
  [ROUTES.HR.DEPARTMENTS]: 'Organize employees into departments.',
  [ROUTES.HR.COMPANY_ASSETS]: 'Track company-owned assets.',
  [ROUTES.HR.ATTENDANCE]: 'Record and review staff attendance.',
  [ROUTES.HR.LEAVE]: 'Manage leave requests and balances.',
  [ROUTES.HR.PAYROLL]: 'Process payroll and pay runs.',
  [ROUTES.HR.TALENT]: 'Recruitment and talent pipeline.',
  [ROUTES.HR.TRANSFERS]: 'Transfer employees between branches and roles.',
  [ROUTES.HR.REPORTS]: 'HR reports and analytics.',
  [ROUTES.HR.SETTINGS]: 'Configure HR policies and settings.',

  [ROUTES.ACCOUNTING.RATIOS]: 'Key financial ratios and performance metrics.',
  [ROUTES.ACCOUNTING.STATEMENTS]: 'Income statement, balance sheet, and cash flow.',
  [ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS]: 'Manage your chart of accounts.',
  [ROUTES.ACCOUNTING.JOURNAL_ENTRIES]: 'Record and review journal entries.',
  [ROUTES.ACCOUNTING.FIXED_ASSETS]: 'Manage fixed assets and depreciation.',

  [ROUTES.FORECASTING.OVERVIEW]: 'Financial forecasting overview.',
  [ROUTES.FORECASTING.BUDGETS]: 'Build and compare forecast budgets.',
  [ROUTES.FORECASTING.KPIS]: 'Track key performance indicators.',
  [ROUTES.FORECASTING.SCENARIOS]: 'Model what-if financial scenarios.',

  [ROUTES.GUIDE.TUTORIALS]: 'Step-by-step guides to get started.',
  [ROUTES.GUIDE.FAQS]: 'Frequently asked questions.',
  [ROUTES.GUIDE.FEEDBACK]: 'Send feedback and feature ideas.',
  [ROUTES.GUIDE.CONTACT]: 'Reach Custosell support.',

  [ROUTES.ACCOUNT.NOTIFICATIONS]: 'Your notifications and alerts.',
  [ROUTES.ACCOUNT.PROFILE]: 'Update your profile and preferences.',
  [ROUTES.ACCOUNT.SECURITY]: 'Change your password, verify your email, and manage two-factor authentication.',
  [ROUTES.ACCOUNT.REFERRALS]: 'Invite others and track your rewards.',

  [ROUTES.SETTINGS.BUSINESS]: 'Business profile and preferences.',
  [ROUTES.SETTINGS.SALES_CHANNELS]: 'Manage your online sales channels.',
  [ROUTES.SETTINGS.TAX]: 'Configure tax rates and VAT settings.',
  [ROUTES.SETTINGS.STAFF]: 'Invite and manage staff members.',
  [ROUTES.SETTINGS.ROLES]: 'Define roles and permissions.',
  [ROUTES.SETTINGS.LOCATIONS]: 'Manage branches and per-branch operations.',
  [ROUTES.SETTINGS.MODULES]: 'Control module access for staff.',
  [ROUTES.SETTINGS.SUBSCRIPTION]: 'Manage your plan and subscription.',
  [ROUTES.SETTINGS.DATA_EXPORT]: 'Export your business data.',

  [ROUTES.YOUR_TOOLS]: 'Browse and launch your tools.',

  [ROUTES.PLATFORM.OVERVIEW]: 'Platform-wide overview and metrics.',
  [ROUTES.PLATFORM.PLANS]: 'Create and manage platform plans.',
  [ROUTES.PLATFORM.SUBSCRIPTIONS]: 'Review all business subscriptions.',
  [ROUTES.PLATFORM.BUSINESSES]: 'Manage businesses on the platform.',
  [ROUTES.PLATFORM.USERS]: 'Manage all platform users.',
  [ROUTES.PLATFORM.ROLES]: 'Define platform-level roles.',
  [ROUTES.PLATFORM.SENT_MESSAGES]: 'Messages sent across the platform.',
  [ROUTES.PLATFORM.SALES_REPS]: 'Manage sales representatives.',
  [ROUTES.PLATFORM.PAYOUTS]: 'Review and manage sales rep payouts.',
  [ROUTES.PLATFORM.CONVERSIONS]: 'Trial-to-paid conversion analytics.',
  [ROUTES.PLATFORM.CAMPAIGN_CODES]: 'Manage referral campaign codes.',

  [ROUTES.PLATFORM.GUIDE.TUTORIALS]: 'Platform tutorials and guides.',
  [ROUTES.PLATFORM.GUIDE.FAQS]: 'Platform frequently asked questions.',
  [ROUTES.PLATFORM.GUIDE.FEEDBACK]: 'Platform feedback and ideas.',
};

/** Resolve a page description, falling back to a derived one-line summary. */
export function describeNavItem(route: string, label: string, group: string): string {
  return NAV_ITEM_DESCRIPTIONS[route] ?? `${group} - ${label}`;
}

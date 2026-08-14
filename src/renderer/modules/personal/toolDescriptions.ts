/** Shared tool copy - used by Your Tools (YourToolsPage) and Data & Export so both
 *  surfaces describe the exact same tools with the same voice. */

/** Personal-account voice - mirrors the register page's value-driven copy. */
export const PERSONAL_DESCRIPTIONS: Record<string, string> = {
  'Online Shopping': 'Browse products and services from every business on Custosell and order them.',
  Sales: 'Manage personal sales and see your money flow - productive, even offline.',
  'Inventory & Supply Chain': 'Keep what you sell stocked and simple to find.',
  Customers: 'Look after the people you sell to and bring them back.',
  'Sales Funnel': 'Track personal projects and close the deals that matter to you.',
  'Projects & Estimates': 'Project Management - plan and estimate your ideas, and track progress.',
  'Income & Expenses': 'Expense Tracking - record what you spend and earn to stay organised.',
  Accounting: 'Bookkeeping - keep your records neat and your numbers in balance.',
  Documents: 'Document Management - store and find your important files with ease.',
  Forecasting: 'Plan ahead and see where you are heading with confidence.',
  'HR & Payroll': 'Look after people, from their pay to their days off.',
  'Custosell Guide': 'Friendly tutorials, FAQs, feedback, and help when you need it.',
  Account: 'Your notifications, profile, and referral insights in one spot.',
  Settings: 'Make Custosell feel like yours - preferences and more.',
};

/** Business-account copy: business-and-warm tone. */
export const BUSINESS_DESCRIPTIONS: Record<string, string> = {
  'Online Shopping': 'Browse and buy products from businesses across Custosell.',
  Dashboard: 'Your business at a glance - key numbers and activity, neatly set.',
  Sales: 'Process orders, track history, and handle refunds and shifts with ease.',
  'Inventory & Supply Chain': 'Keep products, stock, suppliers, and purchase orders in balance.',
  Customers: 'Build stronger relationships and serve every customer well.',
  'Sales Funnel': 'Manage leads and deals on a visual pipeline that keeps your team aligned.',
  'Projects & Estimates': 'Draft professional estimates and run projects your team can track.',
  'Income & Expenses': 'Record income, track expenses, and see your financial health clearly.',
  Accounting: 'Full double-entry accounting - chart of accounts, journals, trial balance, & P&L.',
  Documents: 'Store and organize your business files securely in the cloud.',
  Forecasting: 'Plan budgets, track KPIs, and model future scenarios with confidence.',
  'HR & Payroll': 'Manage people, departments, payroll, and company assets with care.',
  'Custosell Guide': 'Tutorials, FAQs, feedback, and help whenever your team needs it.',
  Account: 'Notifications, your profile, and referral insights for you.',
  Settings: 'Preferences, billing, and data & export - in full control.',
};

export const TOOL_DESCRIPTIONS: Record<'personal' | 'business', Record<string, string>> = {
  personal: PERSONAL_DESCRIPTIONS,
  business: BUSINESS_DESCRIPTIONS,
};

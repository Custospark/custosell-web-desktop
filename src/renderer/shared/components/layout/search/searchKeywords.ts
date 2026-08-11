import { ROUTES } from '../../../../app/routes/constants/shared.paths';

/**
 * Natural-language keywords for every sidebar page, mirroring Custocare's
 * `SearchableModule.keywords` standard. Each entry uses the phrasing a real
 * user would type ("who is waiting", "book appointment", "issue drugs"),
 * so substring/token matching can capture intent the exact page label misses.
 */
export const NAV_ITEM_KEYWORDS: Record<string, string[]> = {
  [ROUTES.DASHBOARD]: ['home', 'overview', 'today', 'daily sales', 'business performance', 'at a glance', 'metrics', 'start here'],

  [ROUTES.SALES.NEW]: ['make a sale', 'start sale', 'sell item', 'point of sale', 'pos', 'checkout', 'sell now', 'new sale', 'add sale', 'register sale'],
  [ROUTES.SALES.ORDERS]: ['open orders', 'sales orders', 'order list', 'pending orders', 'active orders', 'manage orders', 'current orders'],
  [ROUTES.SALES.HISTORY]: ['past sales', 'sales record', 'transaction history', 'previous sales', 'old sales', 'sales archive'],
  [ROUTES.SALES.REFUNDS]: ['process refund', 'return sale', 'reverse sale', 'money back', 'refund customer'],
  [ROUTES.SALES.MY_SHIFT]: ['clock in', 'clock out', 'open shift', 'close shift', 'cash in drawer', 'till', 'shift report'],
  [ROUTES.INVOICES.INDEX]: ['sales invoice', 'bill customer', 'invoice customers', 'issue invoice', 'create invoice', 'billing'],
  [ROUTES.INVOICES.SUPPLIER]: ['supplier invoice', 'vendor bill', 'bills from suppliers', 'pay supplier', 'creditor invoice', 'purchase invoice'],

  [ROUTES.INVENTORY.OVERVIEW]: ['inventory overview', 'stock overview', 'inventory dashboard', 'stock dashboard', 'inventory summary', 'stock summary', 'inventory at a glance', 'low stock', 'out of stock', 'stock value'],
  [ROUTES.INVENTORY.PRODUCTS]: ['product catalog', 'add product', 'new product', 'create product', 'product list', 'item list', 'goods', 'product prices', 'price items', 'stock items'],
  [ROUTES.INVENTORY.CATEGORIES]: ['product categories', 'group products', 'organize products', 'category list', 'product types'],
  [ROUTES.INVENTORY.STOCK]: ['stock levels', 'stock movements', 'inventory ledger', 'stock history', 'quantity', 'stock balance', 'movement record', 'stock in', 'stock out'],
  [ROUTES.INVENTORY.MARKETPLACE]: ['buy stock', 'sell stock', 'supplier marketplace', 'trade inventory', 'order supplies', 'buy and sell'],
  [ROUTES.INVENTORY.PURCHASE_ORDERS]: ['purchase order', 'po', 'buy from supplier', 'create purchase order', 'order stock', 'supplier order'],
  [ROUTES.INVENTORY.INCOMING_ORDERS]: ['receive order', 'stock receiving', 'goods received', 'arriving stock', 'inbound orders', 'incoming stock'],

  [ROUTES.CUSTOMERS.OVERVIEW]: ['customer insights', 'customer segments', 'customer trends', 'customer analytics', 'customer statistics', 'customer demographics'],
  [ROUTES.CUSTOMERS.INDEX]: ['customer list', 'all customers', 'find customer', 'search customer', 'add customer', 'new customer', 'client list', 'customer directory', 'clients'],

  [ROUTES.DISCOVER]: ['browse shops', 'place order', 'find shops', 'online store', 'shop online', 'browse products', 'discover shops'],
  [ROUTES.DISCOVER_MY_ORDERS]: ['online orders', 'placed orders', 'track order', 'order status', 'my online orders'],

  [ROUTES.PIPELINE.BOARDS]: ['kanban boards', 'sales boards', 'funnel boards', 'pipeline boards', 'drag and drop', 'board view'],
  [ROUTES.PIPELINE.MY_WORK]: ['my tasks', 'assigned tasks', 'my boards', 'to do', 'work items'],
  [ROUTES.PIPELINE.LEADS]: ['all leads', 'prospects', 'new leads', 'lead list', 'potential customers', 'sales leads'],
  [ROUTES.PIPELINE.INSIGHTS]: ['conversion', 'funnel analytics', 'sales analytics', 'win rate', 'pipeline performance'],
  [ROUTES.PIPELINE.SETTINGS]: ['funnel settings', 'stage settings', 'configure pipeline', 'pipeline preferences'],
  [ROUTES.PIPELINE.REFERRALS]: ['reward program', 'refer friends', 'invite', 'pipeline referrals', 'bonus'],

  [ROUTES.ESTIMATES.INDEX]: ['all estimates', 'estimate list', 'quotes', 'quotations', 'create estimate', 'new estimate', 'proposal'],
  [ROUTES.ESTIMATES.PROJECTS]: ['all projects', 'project list', 'track projects', 'project management'],
  [ROUTES.ESTIMATES.BOARDS]: ['project boards', 'kanban projects', 'project tasks board', 'project kanban'],
  [ROUTES.ESTIMATES.INSIGHTS]: ['estimate analytics', 'project analytics', 'estimate stats', 'project performance', 'conversion'],
  [ROUTES.ESTIMATES.TEMPLATES]: ['quote templates', 'estimate templates', 'reusable estimate', 'template library'],

  [ROUTES.EXPENSES.OVERVIEW]: ['expense summary', 'income and expenses', 'financial summary', 'money overview', 'cash position'],
  [ROUTES.EXPENSES.INCOME]: ['record income', 'add income', 'business income', 'earnings', 'money in', 'new income'],
  [ROUTES.EXPENSES.BUDGETS]: ['my budgets', 'spending budget', 'budget plan', 'budget tracking', 'budget limits'],
  [ROUTES.EXPENSES.LIST]: ['all expenses', 'expense records', 'business costs', 'money out', 'spending log', 'record expense', 'add expense'],
  [ROUTES.EXPENSES.CATEGORIES]: ['expense categories', 'expense types', 'organize expenses', 'new expense category'],

  [ROUTES.DOCUMENTS.INDEX]: ['business files', 'file storage', 'upload files', 'documents cabinet', 'file library', 'documents', 'files'],

  [ROUTES.HR.OVERVIEW]: ['workforce overview', 'hr metrics', 'employee stats', 'headcount', 'people analytics'],
  [ROUTES.HR.PEOPLE]: ['employees', 'staff list', 'team members', 'add employee', 'new employee', 'employee records', 'people directory'],
  [ROUTES.HR.DEPARTMENTS]: ['team structure', 'org structure', 'department list', 'company structure'],
  [ROUTES.HR.COMPANY_ASSETS]: ['asset tracking', 'company property', 'equipment', 'asset list', 'company assets'],
  [ROUTES.HR.ATTENDANCE]: ['staff attendance', 'who is present', 'attendance record', 'clock in', 'presence'],
  [ROUTES.HR.LEAVE]: ['leave requests', 'time off', 'vacation', 'holiday', 'apply leave', 'leave balance', 'sick leave'],
  [ROUTES.HR.PAYROLL]: ['pay run', 'salaries', 'wages', 'process payroll', 'pay employees', 'compensation', 'payslip'],
  [ROUTES.HR.TALENT]: ['recruitment', 'hiring', 'job applicants', 'candidates', 'interviews', 'job openings'],
  [ROUTES.HR.TRANSFERS]: ['transfers', 'staff transfer', 'employee transfer', 'move employee', 'reassign staff', 'branch transfer', 'relocate'],
  [ROUTES.HR.REPORTS]: ['hr analytics', 'staff reports', 'workforce reports', 'hr statistics'],
  [ROUTES.HR.SETTINGS]: ['hr policies', 'configure hr', 'leave policy', 'company policy', 'hr preferences'],

  [ROUTES.ACCOUNTING.RATIOS]: ['financial ratios', 'liquidity', 'profitability', 'performance ratios', 'ratio analysis'],
  [ROUTES.ACCOUNTING.STATEMENTS]: ['income statement', 'balance sheet', 'cash flow', 'p&l', 'profit and loss', 'financial statements'],
  [ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS]: ['accounts list', 'ledger accounts', 'accounting chart', 'coa', 'account structure'],
  [ROUTES.ACCOUNTING.JOURNAL_ENTRIES]: ['journal', 'double entry', 'accounting entries', 'post entry', 'journal entry'],
  [ROUTES.ACCOUNTING.FIXED_ASSETS]: ['asset register', 'depreciation', 'capital assets', 'long term assets', 'asset schedule'],

  [ROUTES.FORECASTING.OVERVIEW]: ['financial forecast', 'forecasting summary', 'forecast overview', 'projections'],
  [ROUTES.FORECASTING.BUDGETS]: ['forecast budgets', 'budget planning', 'compare budgets', 'forecast plan'],
  [ROUTES.FORECASTING.KPIS]: ['key performance indicators', 'metrics', 'targets', 'performance tracking', 'goal tracking'],
  [ROUTES.FORECASTING.SCENARIOS]: ['what if', 'scenario modeling', 'best case', 'worst case', 'planning scenarios'],

  [ROUTES.GUIDE.TUTORIALS]: ['getting started', 'how to', 'learn', 'training', 'video guides', 'step by step', 'walkthrough'],
  [ROUTES.GUIDE.FAQS]: ['frequently asked questions', 'questions', 'answers', 'common questions', 'help'],
  [ROUTES.GUIDE.FEEDBACK]: ['feature request', 'suggest', 'ideas', 'tell us', 'product feedback'],
  [ROUTES.GUIDE.CONTACT]: ['support', 'help desk', 'reach us', 'customer support', 'chat', 'get help'],

  [ROUTES.ACCOUNT.NOTIFICATIONS]: ['alerts', 'messages', 'updates', 'bell', 'announcements'],
  [ROUTES.ACCOUNT.PROFILE]: ['my profile', 'personal details', 'edit profile', 'account info', 'update name', 'change photo', 'my account'],
  [ROUTES.ACCOUNT.SECURITY]: ['password', 'change password', 'reset password', 'new password', 'update password', 'verify email', 'email verification', 'two-factor', '2fa', 'two factor authentication', 'security code', 'authentication', 'sign-in activity', 'login security', 'account protection', 'secure my account'],
  [ROUTES.ACCOUNT.REFERRALS]: ['refer friends', 'referral program', 'rewards', 'invite friends', 'bonus', 'earn money'],

  [ROUTES.SETTINGS.BUSINESS]: ['business profile', 'business details', 'company info', 'business name', 'logo', 'business preferences'],
  [ROUTES.SETTINGS.SALES_CHANNELS]: ['online channels', 'storefront', 'selling online', 'channel setup', 'online store settings'],
  [ROUTES.SETTINGS.TAX]: ['vat', 'tax rates', 'tax configuration', 'tax setup', 'sales tax'],
  [ROUTES.SETTINGS.STAFF]: ['invite staff', 'manage team', 'add staff', 'team members', 'staff accounts'],
  [ROUTES.SETTINGS.ROLES]: ['permissions', 'role settings', 'access control', 'user roles', 'permission levels'],
  [ROUTES.SETTINGS.LOCATIONS]: ['branches', 'branch', 'location', 'locations', 'store locations', 'multiple stores'],
  [ROUTES.SETTINGS.MODULES]: ['module access', 'enable modules', 'module permissions', 'staff modules', 'feature access'],
  [ROUTES.SETTINGS.SUBSCRIPTION]: ['billing', 'plan', 'upgrade', 'pricing', 'payments', 'renewal', 'invoice', 'subscription status'],
  [ROUTES.SETTINGS.DATA_EXPORT]: ['export data', 'backup', 'download data', 'csv export', 'data download'],

  [ROUTES.PLATFORM.OVERVIEW]: ['platform dashboard', 'global metrics', 'platform analytics', 'tenant overview'],
  [ROUTES.PLATFORM.PLANS]: ['manage plans', 'plan setup', 'pricing plans', 'platform pricing'],
  [ROUTES.PLATFORM.SUBSCRIPTIONS]: ['manage subscriptions', 'all subscriptions', 'business plans'],
  [ROUTES.PLATFORM.BUSINESSES]: ['all businesses', 'tenants', 'business management', 'customer businesses'],
  [ROUTES.PLATFORM.USERS]: ['all users', 'user management', 'platform accounts'],
  [ROUTES.PLATFORM.ROLES]: ['role management', 'platform permissions', 'admin roles'],
  [ROUTES.PLATFORM.SENT_MESSAGES]: ['platform messages', 'broadcast', 'announcements', 'sent communications'],
  [ROUTES.PLATFORM.SALES_REPS]: ['representatives', 'sales team', 'rep management', 'sales agents'],
  [ROUTES.PLATFORM.PAYOUTS]: ['commissions', 'rep payouts', 'earnings', 'payout history'],
  [ROUTES.PLATFORM.CAMPAIGN_CODES]: ['referral codes', 'campaigns', 'promo codes', 'campaign management'],
  [ROUTES.PLATFORM.GUIDE.TUTORIALS]: ['platform tutorials', 'admin guides', 'getting started admin'],
  [ROUTES.PLATFORM.GUIDE.FAQS]: ['platform faqs', 'admin questions', 'platform help'],
  [ROUTES.PLATFORM.GUIDE.FEEDBACK]: ['platform feedback', 'admin feedback', 'platform ideas'],
};

/** Module (group) landing route for module-root shortcuts — mirrors Custocare's shortcut entries. */
export const MODULE_LANDING_ROUTES: Record<string, string> = {
  Dashboard: ROUTES.DASHBOARD,
  Sales: ROUTES.SALES.ORDERS,
  'Inventory & Supply Chain': ROUTES.INVENTORY.OVERVIEW,
  Customers: ROUTES.CUSTOMERS.INDEX,
  'Online Shopping': ROUTES.DISCOVER,
  'Sales Funnel': ROUTES.PIPELINE.BOARDS,
  'Projects & Estimates': ROUTES.ESTIMATES.INDEX,
  'Income & Expenses': ROUTES.EXPENSES.OVERVIEW,
  Documents: ROUTES.DOCUMENTS.INDEX,
  'HR & Payroll': ROUTES.HR.OVERVIEW,
  Accounting: ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS,
  Forecasting: ROUTES.FORECASTING.OVERVIEW,
  'Custosell Guide': ROUTES.GUIDE.TUTORIALS,
  Account: ROUTES.ACCOUNT.PROFILE,
  Settings: ROUTES.SETTINGS.BUSINESS,
  Platform: ROUTES.PLATFORM.OVERVIEW,
};

/** Aliases users type for a whole module, so "stock" / "books" / "quotes" hit the module entry. */
export const MODULE_ALIASES: Record<string, string[]> = {
  Dashboard: ['home', 'main'],
  Sales: ['sell', 'selling', 'point of sale', 'pos', 'cashier'],
  'Inventory & Supply Chain': ['inventory', 'stock', 'supplies', 'warehouse', 'catalog', 'supply chain'],
  Customers: ['customer', 'client', 'clients', 'contacts', 'buyers'],
  'Online Shopping': ['discover', 'online store', 'buy online', 'marketplace', 'shopping'],
  'Sales Funnel': ['pipeline', 'crm', 'leads', 'deals', 'kanban', 'funnel'],
  'Projects & Estimates': ['estimates', 'quotes', 'quotations', 'projects', 'proposals'],
  'Income & Expenses': ['expenses', 'income', 'money', 'finance', 'cashflow', 'spending', 'earnings'],
  Documents: ['documents', 'files', 'storage', 'file cabinet'],
  'HR & Payroll': ['hr', 'human resources', 'people', 'staff', 'employees', 'payroll', 'workforce'],
  Accounting: ['accounting', 'books', 'accounts', 'bookkeeping', 'ledger'],
  Forecasting: ['forecast', 'budgeting', 'predictions', 'planning', 'projections'],
  'Custosell Guide': ['guide', 'help', 'tutorials', 'getting started', 'learn', 'documentation', 'support'],
  Account: ['account', 'profile', 'my account', 'personal'],
  Settings: ['settings', 'configuration', 'preferences', 'setup'],
  Platform: ['platform', 'admin', 'global', 'tenant'],
};

/** All curated keywords for a route, falling back to an empty list. */
export function keywordsForRoute(route: string): string[] {
  return NAV_ITEM_KEYWORDS[route] ?? [];
}

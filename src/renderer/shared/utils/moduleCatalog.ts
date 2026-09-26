import { ROUTES } from '../../app/routes/constants/shared.paths';

export const BUSINESS_MODULE_SLUGS = [
  'dashboard',
  'sales',
  'inventory',
  'customers',
  'pipeline',
  'estimates',
  'expenses',
  'accounting',
  'forecasting',
  'documents',
  'hr',
  'settings',
  'efris',
] as const;

export type BusinessModuleSlug = (typeof BUSINESS_MODULE_SLUGS)[number];

export const MODULE_LABELS: Record<BusinessModuleSlug, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  inventory: 'Inventory & Supply Chain',
  customers: 'Customers',
  pipeline: 'Sales Funnel',
  estimates: 'Projects & Estimates',
  expenses: 'Income & Expenses',
  accounting: 'Accounting',
  forecasting: 'Forecasting',
  documents: 'Documents',
  hr: 'HR & Payroll',
  settings: 'Settings',
  efris: 'EFRIS',
};

export const MODULE_DEFAULT_ROUTES: Record<string, string> = {
  dashboard: ROUTES.DASHBOARD,
  sales: ROUTES.SALES.NEW,
  inventory: ROUTES.INVENTORY.OVERVIEW,
  customers: ROUTES.CUSTOMERS.INDEX,
  pipeline: ROUTES.PIPELINE.BOARDS,
  estimates: ROUTES.ESTIMATES.INDEX,
  expenses: ROUTES.EXPENSES.OVERVIEW,
  accounting: ROUTES.ACCOUNTING.RATIOS,
  forecasting: ROUTES.FORECASTING.OVERVIEW,
  documents: ROUTES.DOCUMENTS.INDEX,
  hr: ROUTES.HR.OVERVIEW,
  settings: ROUTES.SETTINGS.BUSINESS,
  efris: ROUTES.EFRIS.OVERVIEW,
  account: ROUTES.ACCOUNT.NOTIFICATIONS,
  guide: ROUTES.GUIDE.TUTORIALS,
  discover: ROUTES.DISCOVER,
  // Personal modules
  pipeline_personal: ROUTES.PIPELINE.BOARDS,
  accounting_personal: ROUTES.ACCOUNTING.RATIOS,
  your_tools: ROUTES.YOUR_TOOLS,
};

const OWNER_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'dashboard', 'sales', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'forecasting', 'documents', 'hr', 'settings', 'efris',
];

const STAFF_LANDING_PRIORITY: BusinessModuleSlug[] = [
  'sales', 'dashboard', 'inventory', 'customers', 'pipeline', 'estimates', 'expenses', 'accounting', 'forecasting', 'documents', 'hr', 'settings', 'efris',
];

/** Nav group label → module slug for business-scoped sidebar groups. */
export const NAV_GROUP_MODULE: Record<string, BusinessModuleSlug | 'account' | 'guide' | 'discover' | 'platform' | 'guide_settings'> = {
  Dashboard: 'dashboard',
  Sales: 'sales',
  Inventory: 'inventory',
  'Inventory & Supply Chain': 'inventory',
  Customers: 'customers',
  'Sales Funnel': 'pipeline',
  'Projects & Estimates': 'estimates',
  Estimates: 'estimates',
  Expenses: 'expenses',
  'Income & Expenses': 'expenses',
  Accounting: 'accounting',
  Forecasting: 'forecasting',
  Documents: 'documents',
  'HR & Payroll': 'hr',
  Settings: 'settings',
  EFRIS: 'efris',
  Account: 'account',
  'Custosell Guide': 'guide',
  'Online Shopping': 'discover',
  Platform: 'platform',
  'Guide Settings': 'guide_settings',
};

export { OWNER_LANDING_PRIORITY, STAFF_LANDING_PRIORITY };

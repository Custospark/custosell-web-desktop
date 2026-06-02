export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SALES: { INDEX: '/sales', NEW: '/sales/new', HISTORY: '/sales/history', REFUNDS: '/sales/refunds' },
  INVENTORY: { INDEX: '/inventory', PRODUCTS: '/inventory/products', CATEGORIES: '/inventory/categories', STOCK: '/inventory/stock' },
  CUSTOMERS: { INDEX: '/customers' },
  EXPENSES: { INDEX: '/expenses', CATEGORIES: '/expenses/categories', LIST: '/expenses/list' },
  SETTINGS: { INDEX: '/settings', BUSINESS: '/settings/business', STAFF: '/settings/staff', ROLES: '/settings/roles', SUBSCRIPTION: '/settings/subscription' },
} as const;

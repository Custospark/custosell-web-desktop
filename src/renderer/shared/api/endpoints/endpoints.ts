export { PLATFORM } from './platformEndpoints';
export { GUIDE } from './guideEndpoints';

export const AUTH = { REGISTER: '/auth/register', LOGIN: '/auth/login', LOGOUT: '/auth/logout', ME: '/auth/me', PROFILE: '/auth/profile' };
export const PLANS = '/plans';
export const BUSINESSES = { REGISTER: '/businesses/register', MINE: '/businesses/mine', SETTINGS: '/businesses/settings', PROFILE: '/businesses/profile' };
export const ROLES = { BASE: '/roles', BY_ID: (id: number) => `/roles/${id}` };
export const USERS = { BASE: '/users', BY_ID: (id: number) => `/users/${id}` };
export const CATEGORIES = '/categories';
export const PRODUCTS = { BASE: '/products', LOW_STOCK: '/products/low-stock' };
export const CUSTOMERS = { BASE: '/customers', PURCHASES: (id: number) => `/customers/${id}/purchases` };
export const SHIFTS = { CLOCK_IN: '/shifts/clock-in', ACTIVE: '/shifts/active', BASE: '/shifts' };
export const SALES = { BASE: '/sales', DAILY: '/sales/daily', REFUND: (id: number) => `/sales/${id}/refund` };
export const STOCK_MOVEMENTS = '/stock-movements';
export const SUBSCRIPTIONS = { BASE: '/subscriptions', UPGRADE: '/subscriptions/upgrade', CANCEL: '/subscriptions/cancel' };
export const EXPENSE_CATEGORIES = '/expense-categories';
export const EXPENSES = '/expenses';
export const SYNC = { PUSH: '/sync/push', PULL: '/sync/pull', FULL: '/sync/full' };
export const NOTIFICATIONS = {
  BASE: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  READ_ALL: '/notifications/read-all',
  DELETE_ALL: '/notifications/delete-all',
  BULK_DELETE: '/notifications/bulk-delete',
  MARK_READ: (id: number) => `/notifications/${id}/read`,
  DELETE: (id: number) => `/notifications/${id}`,
};

export const ACCOUNTING = {
  COA: '/chart-of-accounts',
  COA_TREE: '/chart-of-accounts/tree',
  COA_ITEM: (id: number) => `/chart-of-accounts/${id}`,
  PERIODS: '/accounting-periods',
  CURRENT_PERIOD: '/accounting-periods/current',
  PERIOD: (id: number) => `/accounting-periods/${id}`,
  closePeriod: (id: number) => `/accounting-periods/${id}/close`,
  reopenPeriod: (id: number) => `/accounting-periods/${id}/reopen`,
  JOURNAL_ENTRIES: '/journal-entries',
  journalEntry: (id: number) => `/journal-entries/${id}`,
  journalEntryLines: (id: number) => `/journal-entries/${id}/lines`,
  postJournalEntry: (id: number) => `/journal-entries/${id}/post`,
  reverseJournalEntry: (id: number) => `/journal-entries/${id}/reverse`,
  TRIAL_BALANCE: '/general-ledger/trial-balance',
  INCOME_STATEMENT: '/general-ledger/profit-loss',
  BALANCE_SHEET: '/general-ledger/balance-sheet',
  CASH_FLOW: '/general-ledger/cash-flow',
  EQUITY: '/general-ledger/equity',
  RATIOS: '/ratios',
  RATIO_TRENDS: '/ratios/trends',
  FIXED_ASSETS: '/fixed-assets',
  FIXED_ASSET: (id: number) => `/fixed-assets/${id}`,
  EXPORT: (type: string) => `/accounting/export/${type}`,
};

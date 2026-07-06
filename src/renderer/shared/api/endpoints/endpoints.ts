export { PLATFORM } from './platformEndpoints';
export { GUIDE } from './guideEndpoints';

export const AUTH = { REGISTER: '/auth/register', LOGIN: '/auth/login', LOGOUT: '/auth/logout', ME: '/auth/me', PROFILE: '/auth/profile' };
export const PLANS = '/plans';
export const BUSINESSES = { REGISTER: '/businesses/register', MINE: '/businesses/mine', SETTINGS: '/businesses/settings', PROFILE: '/businesses/profile' };
export const ROLES = { BASE: '/roles', BY_ID: (id: number) => `/roles/${id}` };
export const USERS = { BASE: '/users', BY_ID: (id: number) => `/users/${id}` };
export const CATEGORIES = '/categories';
export const PRODUCTS = { BASE: '/products', LOW_STOCK: '/products/low-stock' };
export const CUSTOMERS = { BASE: '/customers', RESOLVE: '/customers/resolve', PURCHASES: (id: number) => `/customers/${id}/purchases` };
export const SHIFTS = {
  CLOCK_IN: '/shifts/clock-in',
  ACTIVE: '/shifts/active',
  BASE: '/shifts',
  PAYMENTS: (id: number) => `/shifts/${id}/payments`,
};
export const SALES = {
  BASE: '/sales',
  DAILY: '/sales/daily',
  REFUND: (id: number) => `/sales/${id}/refund`,
  PAYMENT: (id: number) => `/sales/${id}/payment`,
  ASSIGN_CUSTOMER: (id: number) => `/sales/${id}/customer`,
};

export const PAYMENTS = {
  BY_ID: (id: number) => `/payments/${id}`,
  RECEIPT: (id: number) => `/payments/${id}/receipt`,
  EMAIL: (id: number) => `/payments/${id}/email`,
};
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

export const INVOICES = {
  BASE: '/invoices',
  BY_ID: (id: number) => `/invoices/${id}`,
  SEND: (id: number) => `/invoices/${id}/send`,
  EMAIL: (id: number) => `/invoices/${id}/email`,
  PAYMENT: (id: number) => `/invoices/${id}/payment`,
  PDF: (id: number) => `/invoices/${id}/pdf`,
};

export const ESTIMATES = {
  BASE: '/estimates',
  BY_ID: (id: number) => `/estimates/${id}`,
  SEND: (id: number) => `/estimates/${id}/send`,
  APPROVE: (id: number) => `/estimates/${id}/approve`,
  REJECT: (id: number) => `/estimates/${id}/reject`,
  EMAIL: (id: number) => `/estimates/${id}/email`,
  PDF: (id: number) => `/estimates/${id}/pdf`,
  DUPLICATE: (id: number) => `/estimates/${id}/duplicate`,
  VERSIONS: (id: number) => `/estimates/${id}/versions`,
  CONVERT_INVOICE: (id: number) => `/estimates/${id}/convert-to-invoice`,
  CONVERT_PROJECT: (id: number) => `/estimates/${id}/convert-to-project`,
  ANALYTICS: '/estimates/analytics',
  TEMPLATES: '/estimates/templates',
  TEMPLATE: (id: number) => `/estimates/templates/${id}`,
};

export const PROJECTS = {
  BASE: '/projects',
  BY_ID: (id: number) => `/projects/${id}`,
  TASKS: (id: number) => `/projects/${id}/tasks`,
  TASK: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
  TIMESHEETS: (id: number) => `/projects/${id}/timesheets`,
  TIMESHEET: (projectId: number, entryId: number) => `/projects/${projectId}/timesheets/${entryId}`,
  ALLOCATIONS: (id: number) => `/projects/${id}/allocations`,
  ALLOCATION: (projectId: number, allocationId: number) => `/projects/${projectId}/allocations/${allocationId}`,
  BUDGET_SUMMARY: (id: number) => `/projects/${id}/budget-summary`,
  PROFITABILITY: (id: number) => `/projects/${id}/profitability`,
  BOARD: (id: number) => `/projects/${id}/board`,
};

export const PIPELINE = {
  BOARDS: '/pipeline/boards',
  BOARD: (id: number) => `/pipeline/boards/${id}`,
  BOARD_KANBAN: (id: number) => `/pipeline/boards/${id}/kanban`,
  BOARD_CALENDAR: (id: number) => `/pipeline/boards/${id}/calendar`,
  STAGES: (boardId: number) => `/pipeline/boards/${boardId}/stages`,
  STAGES_REORDER: (boardId: number) => `/pipeline/boards/${boardId}/stages/reorder`,
  STAGE: (stageId: number) => `/pipeline/stages/${stageId}`,
  LEADS: '/pipeline/leads',
  LEAD: (id: number) => `/pipeline/leads/${id}`,
  LEAD_STAGE: (id: number) => `/pipeline/leads/${id}/stage`,
  LEAD_CONVERT: (id: number) => `/pipeline/leads/${id}/convert`,
  LEAD_ACTIVITIES: (leadId: number) => `/pipeline/leads/${leadId}/activities`,
  SOURCES: '/pipeline/sources',
  SOURCE: (id: number) => `/pipeline/sources/${id}`,
  INSIGHTS: '/pipeline/insights',
  LABELS: '/pipeline/labels',
  LABEL: (id: number) => `/pipeline/labels/${id}`,
  LEAD_CHECKLISTS: (leadId: number) => `/pipeline/leads/${leadId}/checklists`,
  CHECKLIST: (id: number) => `/pipeline/checklists/${id}`,
  CHECKLIST_ITEMS: (checklistId: number) => `/pipeline/checklists/${checklistId}/items`,
  CHECKLIST_ITEM: (id: number) => `/pipeline/checklist-items/${id}`,
  LEAD_ATTACHMENTS: (leadId: number) => `/pipeline/leads/${leadId}/attachments`,
  ATTACHMENT: (id: number) => `/pipeline/attachments/${id}`,
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
  INVENTORY_RECONCILIATION: '/inventory/reconciliation',
  INVENTORY_OPENING_BALANCE: '/inventory/opening-balance',
};

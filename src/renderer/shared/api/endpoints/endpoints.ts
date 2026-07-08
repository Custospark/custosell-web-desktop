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
  MY: '/my-projects',
  BY_ID: (id: number) => `/projects/${id}`,
  MEMBERS: (id: number) => `/projects/${id}/members`,
  MEMBER: (projectId: number, userId: number) => `/projects/${projectId}/members/${userId}`,
  TASKS: (id: number) => `/projects/${id}/tasks`,
  TASK: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
  TIMESHEETS: (id: number) => `/projects/${id}/timesheets`,
  TIMESHEET: (projectId: number, entryId: number) => `/projects/${projectId}/timesheets/${entryId}`,
  ALLOCATIONS: (id: number) => `/projects/${id}/allocations`,
  ALLOCATION: (projectId: number, allocationId: number) => `/projects/${projectId}/allocations/${allocationId}`,
  BUDGET_SUMMARY: (id: number) => `/projects/${id}/budget-summary`,
  PROFITABILITY: (id: number) => `/projects/${id}/profitability`,
  BOARD: (id: number) => `/projects/${id}/board`,
  BOARD_KANBAN: (id: number) => `/projects/${id}/board/kanban`,
};

export const PIPELINE = {
  BOARDS: '/pipeline/boards',
  TEAM_MEMBERS: '/pipeline/team-members',
  BOARD: (id: number) => `/pipeline/boards/${id}`,
  BOARD_KANBAN: (id: number) => `/pipeline/boards/${id}/kanban`,
  BOARD_CALENDAR: (id: number) => `/pipeline/boards/${id}/calendar`,
  BOARD_BACKGROUND: (id: number) => `/pipeline/boards/${id}/background`,
  STAGES: (boardId: number) => `/pipeline/boards/${boardId}/stages`,
  STAGES_REORDER: (boardId: number) => `/pipeline/boards/${boardId}/stages/reorder`,
  STAGE: (stageId: number) => `/pipeline/stages/${stageId}`,
  LEADS: '/pipeline/leads',
  LEAD: (id: number) => `/pipeline/leads/${id}`,
  LEAD_STAGE: (id: number) => `/pipeline/leads/${id}/stage`,
  LEAD_CONVERT: (id: number) => `/pipeline/leads/${id}/convert`,
  LEAD_ACTIVITIES: (leadId: number) => `/pipeline/leads/${leadId}/activities`,
  ACTIVITY: (id: number) => `/pipeline/activities/${id}`,
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
  ACTIVITY_REACTION: (id: number) => `/pipeline/activities/${id}/reaction`,
  BOARD_ANNOUNCEMENTS: (boardId: number) => `/pipeline/boards/${boardId}/announcements`,
  BOARD_COLLABORATION_SUMMARY: (boardId: number) => `/pipeline/boards/${boardId}/collaboration-summary`,
  ANNOUNCEMENT: (id: number) => `/pipeline/announcements/${id}`,
  ANNOUNCEMENT_READ: (id: number) => `/pipeline/announcements/${id}/read`,
  BOARD_POLLS: (boardId: number) => `/pipeline/boards/${boardId}/polls`,
  POLL: (pollId: number) => `/pipeline/polls/${pollId}`,
  POLL_VOTE: (pollId: number) => `/pipeline/polls/${pollId}/vote`,
  LEAD_REMINDERS: (leadId: number) => `/pipeline/leads/${leadId}/reminders`,
  REMINDER: (id: number) => `/pipeline/reminders/${id}`,
  BOARD_RESOURCES_SUMMARY: (boardId: number) => `/pipeline/boards/${boardId}/resources/summary`,
  BOARD_RESOURCE_MEMBERS: (boardId: number) => `/pipeline/boards/${boardId}/resources/members`,
  BOARD_RESOURCES: (boardId: number) => `/pipeline/boards/${boardId}/resources`,
  BOARD_RESOURCE_LINK: (boardId: number) => `/pipeline/boards/${boardId}/resources/link`,
  BOARD_RESOURCE_UPLOAD: (boardId: number) => `/pipeline/boards/${boardId}/resources/upload`,
  BOARD_RESOURCE: (id: number) => `/pipeline/resources/${id}`,
  BOARD_RESOURCE_VIEW: (id: number) => `/pipeline/resources/${id}/view`,
  BOARD_RESOURCE_DOWNLOAD: (id: number) => `/pipeline/resources/${id}/download`,
  BOARD_CONVERSATION_SUMMARY: (boardId: number) => `/pipeline/boards/${boardId}/conversation/summary`,
  BOARD_CONVERSATION_MESSAGES: (boardId: number) => `/pipeline/boards/${boardId}/conversation/messages`,
  BOARD_CONVERSATION_READ: (boardId: number) => `/pipeline/boards/${boardId}/conversation/read`,
  BOARD_CONVERSATION_MESSAGE: (id: number) => `/pipeline/conversation/messages/${id}`,
  BOARD_CONVERSATION_MESSAGE_REACTION: (id: number) => `/pipeline/conversation/messages/${id}/reaction`,
  BOARD_CONVERSATION_MESSAGE_PIN: (id: number) => `/pipeline/conversation/messages/${id}/pin`,
  BOARD_CONVERSATION_MESSAGE_ATTACHMENTS: (id: number) => `/pipeline/conversation/messages/${id}/attachments`,
  BOARD_CONVERSATION_ATTACHMENT: (id: number) => `/pipeline/conversation/attachments/${id}`,
  BOARD_CONVERSATION_ACTIVITY: (boardId: number) => `/pipeline/boards/${boardId}/conversation/activity`,
  BOARD_AUTOMATIONS: (boardId: number) => `/pipeline/boards/${boardId}/automations`,
  BOARD_AUTOMATION: (id: number) => `/pipeline/automations/${id}`,
  BOARD_TEMPLATES: '/pipeline/board-templates',
  BOARD_APPLY_TEMPLATE: (boardId: number) => `/pipeline/boards/${boardId}/apply-template`,
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

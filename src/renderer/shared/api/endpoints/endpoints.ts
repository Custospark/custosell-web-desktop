export { PLATFORM } from './platformEndpoints';
export { GUIDE } from './guideEndpoints';

export const AUTH = { REGISTER: '/auth/register', LOGIN: '/auth/login', LOGOUT: '/auth/logout', ME: '/auth/me', PROFILE: '/auth/profile', VERIFY_SEND: '/auth/verify/send', VERIFY: '/auth/verify', TWO_FACTOR: '/auth/two-factor', ACTIVITY: '/auth/activity' };
export const PLANS = '/plans';
export const BUSINESSES = {
  REGISTER: '/businesses/register',
  MINE: '/businesses/mine',
  SETTINGS: '/businesses/settings',
  PROFILE: '/businesses/profile',
  SUPPLY_PROFILE: '/businesses/supply-profile',
  STOREFRONT_PROFILE: '/businesses/storefront-profile',
  SLUG_AVAILABLE: '/businesses/slug-available',
  EXPORT: '/businesses/export',
  DELETE_ACCOUNT: '/businesses/account',
};
export const ROLES = { BASE: '/roles', BY_ID: (id: number) => `/roles/${id}` };
export const USERS = {
  BASE: '/users',
  BY_ID: (id: number) => `/users/${id}`,
  LOOKUP: '/users/lookup',
  ATTACH: '/users/attach',
  DETACH: (id: number) => `/users/${id}/detach`,
};
export const LOCATIONS = {
  BASE: '/locations',
  ACTIVE: '/locations/active',
  BY_ID: (id: number) => `/locations/${id}`,
  DEFAULT: (id: number) => `/locations/${id}/default`,
};
export const STAFF_TRANSFERS = {
  BASE: '/staff-transfers',
  BY_ID: (id: number) => `/staff-transfers/${id}`,
};
export const CATEGORIES = '/categories';
export const PRODUCTS = {
  BASE: '/products',
  LOW_STOCK: '/products/low-stock',
  SUPPLY_LISTING: (id: number) => `/products/${id}/supply-listing`,
  STOREFRONT_LISTING: (id: number) => `/products/${id}/storefront-listing`,
  IMAGE: (id: number) => `/products/${id}/image`,
  BULK_LISTING: '/products/bulk-listing',
};
export const CUSTOMERS = { BASE: '/customers', OVERVIEW: '/customers/overview', RESOLVE: '/customers/resolve', PURCHASES: (id: number) => `/customers/${id}/purchases` };
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
  EMAIL: (id: number) => `/sales/${id}/email`,
  PDF: (id: number) => `/sales/${id}/pdf`,
};

export const PAYMENTS = {
  BY_ID: (id: number) => `/payments/${id}`,
  RECEIPT: (id: number) => `/payments/${id}/receipt`,
  EMAIL: (id: number) => `/payments/${id}/email`,
};
export const STOCK_MOVEMENTS = '/stock-movements';
export const STOCK_TRANSFER = '/stock-movements/transfer';
export const REPORTS = {
  BRANCH_PERFORMANCE: '/reports/branch-performance',
};
export const SUBSCRIPTIONS = {
  BASE: '/subscriptions',
  ACCESS: '/subscriptions/access',
  SUBSCRIBE: '/subscriptions/subscribe',
  UPGRADE: (id: number) => `/subscriptions/${id}/upgrade`,
  PRORATION_QUOTE: (id: number) => `/subscriptions/${id}/proration-quote`,
  DOWNGRADE: (id: number) => `/subscriptions/${id}/downgrade`,
  CHANGES: (id: number) => `/subscriptions/${id}/changes`,
  CANCEL_CHANGE: (id: number) => `/subscriptions/${id}/cancel-change`,
  CANCEL: (id: number) => `/subscriptions/${id}/cancel`,
  BILLING_CYCLE: (id: number) => `/subscriptions/${id}/billing-cycle`,
  REACTIVATE: (id: number) => `/subscriptions/${id}/reactivate`,
};
export const BILLING = {
  PAYMENTS: '/billing/payments',
  PAYMENT: (id: number) => `/billing/payments/${id}`,
  INITIATE: '/billing/payments/initiate',
  CONFIRM: (id: number) => `/billing/payments/${id}/confirm`,
  RECEIPT: (id: number) => `/billing/payments/${id}/receipt`,
  RECEIPT_EMAIL: (id: number) => `/billing/payments/${id}/receipt/email`,
  HISTORY: '/billing/history',
};
export const EXPENSE_CATEGORIES = '/expense-categories';
export const EXPENSES = '/expenses';
export const INCOME_SOURCES = '/income-sources';
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

export const PUBLIC_BOOKING = {
  INFO: (token: string) => `/public/book/${token}`,
  SLOTS: (token: string) => `/public/book/${token}/slots`,
  BOOK: (token: string) => `/public/book/${token}`,
};

export const PIPELINE_BOOKING = {
  SETTINGS: (boardId: number) => `/pipeline/boards/${boardId}/booking-settings`,
  REGENERATE_TOKEN: (boardId: number) => `/pipeline/boards/${boardId}/booking-settings/regenerate-token`,
};

export const PIPELINE = {
  BOARDS: '/pipeline/boards',
  TEAM_MEMBERS: '/pipeline/team-members',
  BOARD: (id: number) => `/pipeline/boards/${id}`,
  BOARD_DUPLICATE: (id: number) => `/pipeline/boards/${id}/duplicate`,
  BOARD_KANBAN: (id: number) => `/pipeline/boards/${id}/kanban`,
  BOARD_CALENDAR: (id: number) => `/pipeline/boards/${id}/calendar`,
  ALL_BOARDS_CALENDAR: '/pipeline/calendar',
  BOARD_BACKGROUND: (id: number) => `/pipeline/boards/${id}/background`,
  BOARD_IMPORT_TEMPLATE: (id: number) => `/pipeline/boards/${id}/import-template`,
  BOARD_IMPORT: (id: number) => `/pipeline/boards/${id}/import`,
  STAGES: (boardId: number) => `/pipeline/boards/${boardId}/stages`,
  STAGES_REORDER: (boardId: number) => `/pipeline/boards/${boardId}/stages/reorder`,
  STAGE: (stageId: number) => `/pipeline/stages/${stageId}`,
  LEADS: '/pipeline/leads',
  LEAD: (id: number) => `/pipeline/leads/${id}`,
  LEAD_STAGE: (id: number) => `/pipeline/leads/${id}/stage`,
  LEAD_CONVERT: (id: number) => `/pipeline/leads/${id}/convert`,
  LEAD_ACTIVITIES: (leadId: number) => `/pipeline/leads/${leadId}/activities`,
  ACTIVITY: (id: number) => `/pipeline/activities/${id}`,
  LEAD_LINKS: (leadId: number) => `/pipeline/leads/${leadId}/links`,
  LINK: (id: number) => `/pipeline/links/${id}`,
  BOARD_META_FIELDS: (boardId: number) => `/pipeline/boards/${boardId}/meta-fields`,
  META_FIELD: (id: number) => `/pipeline/meta-fields/${id}`,
  LEAD_META_VALUES: (leadId: number) => `/pipeline/leads/${leadId}/meta-values`,
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
  LEAD_ATTACHMENT_LINK: (leadId: number) => `/pipeline/leads/${leadId}/attachments/link`,
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
  BOARD_TEMPLATES: '/pipeline/board-templates',
  BOARD_APPLY_TEMPLATE: (boardId: number) => `/pipeline/boards/${boardId}/apply-template`,
  BOARD_PROGRESS_SUMMARY: (boardId: number) => `/pipeline/boards/${boardId}/progress/summary`,
  BOARD_PROGRESS_QUERY: (boardId: number) => `/pipeline/boards/${boardId}/progress/query`,
  BOARD_PROGRESS_MY: (boardId: number) => `/pipeline/boards/${boardId}/progress/my`,
  BOARD_PROGRESS_CONFIG: (boardId: number) => `/pipeline/boards/${boardId}/progress/config`,
  BOARD_PROGRESS_EXPORT: (boardId: number) => `/pipeline/boards/${boardId}/progress/export`,
  BOARD_TARGETS_DECOMPOSE_PREVIEW: (boardId: number) => `/pipeline/boards/${boardId}/targets/decompose-preview`,
  BOARD_TARGETS: (boardId: number) => `/pipeline/boards/${boardId}/targets`,
  BOARD_TARGET: (targetId: number) => `/pipeline/targets/${targetId}`,
  WALL_OF_FAME: '/pipeline/wall-of-fame',
  WALL_OF_FAME_POST: (id: number) => `/pipeline/wall-of-fame/${id}`,
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
  runDepreciation: '/fixed-assets/run-depreciation',
  fixedAssetSchedule: (id: number) => `/fixed-assets/${id}/schedule`,
  EXPORT: (type: string) => `/accounting/export/${type}`,
  INVENTORY_RECONCILIATION: '/inventory/reconciliation',
  INVENTORY_OPENING_BALANCE: '/inventory/opening-balance',
};

export const STOREFRONT = {
  DISCOVER: '/storefront/discover',
  SHOPS: '/storefront/shops',
  CATEGORIES: '/storefront/categories',
  MY_ORDERS: '/storefront/my-orders',
  MY_ORDER_SALE: (orderId: number) => `/storefront/my-orders/${orderId}/sale`,
  MY_ORDER_INVOICE: (orderId: number) => `/storefront/my-orders/${orderId}/invoice`,
  MY_ORDER_INVOICE_PDF: (orderId: number) => `/storefront/my-orders/${orderId}/invoice/pdf`,
  MY_ORDER_CANCEL: (orderId: number) => `/storefront/my-orders/${orderId}/cancel`,
  MY_ORDER: (orderId: number) => `/storefront/my-orders/${orderId}`,
  SHOP: (slug: string) => `/storefront/${slug}`,
  PRODUCTS: (slug: string) => `/storefront/${slug}/products`,
  ORDERS: (slug: string) => `/storefront/${slug}/orders`,
  RATE_PRODUCT: (slug: string, productId: number) =>
    `/storefront/${slug}/products/${productId}/ratings`,
  RATE_SHOP: (slug: string) => `/storefront/${slug}/ratings`,
  WISHLIST: '/storefront/wishlist',
  WISHLIST_ITEM: (id: number) => `/storefront/wishlist/${id}`,
  WISHLIST_BY_PRODUCT: (productId: number) => `/storefront/wishlist/by-product/${productId}`,
};

export const REFERRALS = {
  EARNINGS: '/referrals/earnings/me',
  APPLY: '/referrals/apply',
};

export const REFERRAL_CODES = {
  BASE: '/referral-codes',
  VALIDATE: '/referral-codes/validate',
};

export const CURRENCY = {
  CONVERT: '/currencies/convert',
};
export const SALES_REPS = {
  BASE: '/sales-reps',
  EARNINGS_ALL: '/sales-reps/earnings/all',
  EARNINGS_MINE: '/sales-reps/earnings/mine',
  EARNINGS: (id: number) => `/sales-reps/${id}/earnings`,
  BY_ID: (id: number) => `/sales-reps/${id}`,
  IMPORT_TEMPLATE: '/sales-reps/import-template',
  IMPORT: '/sales-reps/import',
  PAYOUTS: (id: number) => `/sales-reps/${id}/payouts`,
};

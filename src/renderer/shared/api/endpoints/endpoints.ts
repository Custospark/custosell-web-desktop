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
  MARK_READ: (id: number) => `/notifications/${id}/read`,
  DELETE: (id: number) => `/notifications/${id}`,
};
export const PLATFORM = {
  OVERVIEW: '/platform/overview',
  METRICS: '/platform/metrics',
  BUSINESSES: '/platform/businesses',
  BUSINESS_STATS: '/platform/businesses/stats',
  BUSINESS_STATUS: (id: number) => `/platform/businesses/${id}/status`,
  BUSINESS_DELETE: (id: number) => `/platform/businesses/${id}`,
  BUSINESSES_BULK_DELETE: '/platform/businesses/bulk-delete',
  BUSINESSES_BULK_STATUS: '/platform/businesses/bulk-status',
  BUSINESSES_NOTIFY: '/platform/businesses/notify',
  USERS: '/platform/users',
  USER_STATS: '/platform/users/stats',
  USER_STATUS: (id: number) => `/platform/users/${id}/status`,
  USER_DELETE: (id: number) => `/platform/users/${id}`,
  USERS_BULK_DELETE: '/platform/users/bulk-delete',
  USERS_BULK_ASSIGN_ROLES: '/platform/users/bulk-assign-roles',
  USERS_BULK_STATUS: '/platform/users/bulk-status',
  USERS_NOTIFY: '/platform/users/notify',
  ROLES: '/platform/roles',
  ROLE: (id: number) => `/platform/roles/${id}`,
  PERMISSIONS: '/platform/permissions',
  GUIDE: {
    TUTORIALS: '/platform/guide/tutorials',
    TUTORIAL: (id: number) => `/platform/guide/tutorials/${id}`,
    TUTORIALS_PREVIEW_THUMB: '/platform/guide/tutorials/preview-thumbnail',
    TUTORIALS_UPLOAD_PENDING: '/platform/guide/tutorials/upload-thumbnail-pending',
    TUTORIAL_UPLOAD_THUMB: (id: number) => `/platform/guide/tutorials/${id}/upload-thumbnail`,
    FAQS: '/platform/guide/faqs',
    FAQ: (id: number) => `/platform/guide/faqs/${id}`,
    FEEDBACK: '/platform/guide/feedback',
    FEEDBACK_ITEM: (id: number) => `/platform/guide/feedback/${id}`,
  },
};
export const GUIDE = {
  TUTORIALS: '/guide/tutorials',
  FAQS: '/guide/faqs',
  FEEDBACK: '/guide/feedback',
  FEEDBACK_MINE: '/guide/feedback/mine',
};

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
  MARK_READ: (id: number) => `/notifications/${id}/read`,
  DELETE: (id: number) => `/notifications/${id}`,
};

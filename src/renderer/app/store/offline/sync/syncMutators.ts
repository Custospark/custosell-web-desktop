import type { QueuedMutation } from './mutationQueue';
import type { ExpenseFormPayload } from '../../../../modules/expenses/api/ExpenseTypes';

export function isSaleMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/sales';
}

export function isOrderCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/orders';
}

export function isOrderMutation(m: QueuedMutation): boolean {
  return (
    isOrderCreateMutation(m)
    || (m.method === 'PUT' && /^\/orders\/-?\d+$/.test(m.url))
    || (m.method === 'POST' && /^\/orders\/-?\d+\/cancel$/.test(m.url))
  );
}

export function isShiftOpenMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/shifts';
}

export function isShiftCloseMutation(m: QueuedMutation): boolean {
  return m.method === 'PUT' && /^\/shifts\/-?\d+$/.test(m.url);
}

export function isRefundMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && /^\/sales\/-?\d+\/refund$/.test(m.url);
}

export function isProductMutation(m: QueuedMutation): boolean {
  return /^\/products(\/\d+)?$/.test(m.url);
}

export function isCategoryMutation(m: QueuedMutation): boolean {
  return /^\/categories(\/\d+)?$/.test(m.url);
}

export function isCustomerMutation(m: QueuedMutation): boolean {
  return /^\/customers(\/\d+)?$/.test(m.url);
}

export function isExpenseMutation(m: QueuedMutation): boolean {
  return /^\/expenses(\/-?\d+)?$/.test(m.url);
}

export function isExpenseCategoryMutation(m: QueuedMutation): boolean {
  return /^\/expense-categories(\/-?\d+)?$/.test(m.url);
}

export function isRoleMutation(m: QueuedMutation): boolean {
  return /^\/roles(\/-?\d+)?$/.test(m.url);
}

export function isStaffMutation(m: QueuedMutation): boolean {
  return /^\/users(\/-?\d+)?$/.test(m.url);
}

export function isBusinessSettingsMutation(m: QueuedMutation): boolean {
  return m.url === '/businesses/profile' || m.url === '/businesses/settings';
}

export function isGuideFeedbackMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/guide/feedback';
}

export function isCategoryCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/categories';
}

export function isProductCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/products';
}

export function isExpenseCategoryCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/expense-categories';
}

export function isRoleCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/roles';
}

export function isStaffCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/users';
}

export function isExpenseFormPayload(data: unknown): data is ExpenseFormPayload {
  return Boolean(data && typeof data === 'object' && 'fields' in data);
}

export function extractShiftIdFromCloseUrl(url: string): number | null {
  const match = url.match(/^\/shifts\/(-?\d+)$/);
  return match ? Number(match[1]) : null;
}
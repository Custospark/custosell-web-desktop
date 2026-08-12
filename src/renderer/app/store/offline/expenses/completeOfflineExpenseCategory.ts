import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localExpenseCategoriesStore } from './localExpenseCategoriesStore';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import type {
  CreateExpenseCategoryData,
  ExpenseCategory,
  ExpenseCategoryWithSyncMeta,
} from '../../../../modules/expenses/api/ExpenseTypes';

export function shouldCompleteExpenseCategoryLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalExpenseCategory(payload: CreateExpenseCategoryData): ExpenseCategoryWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const category: ExpenseCategory = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    name: payload.name,
    description: payload.description ?? null,
    sort_order: payload.sort_order ?? 0,
    budget_amount: payload.budget_amount != null ? String(payload.budget_amount) : null,
    budget_period: payload.budget_period ?? null,
    created_at: now,
    updated_at: now,
  };

  return { ...category, _pendingSync: true };
}

export async function persistOfflineExpenseCategoryInBackground(
  category: ExpenseCategoryWithSyncMeta,
  payload: CreateExpenseCategoryData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/expense-categories';

  if (mutationType === 'create') {
    method = 'POST';
    url = '/expense-categories';
  } else if (mutationType === 'update') {
    method = 'PUT';
    url = `/expense-categories/${category.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/expense-categories/${(payload as { id: number }).id}`;
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineExpenseCategory] Enqueue failed:', err);
  }

  try {
    const localId = await localExpenseCategoriesStore.save(category, payload, mutationId, mutationType);
    category._localId = localId;
  } catch (err) {
    console.error('[OfflineExpenseCategory] Local store save failed:', err);
  }
}

export function completeOfflineCreateExpenseCategoryInstant(
  payload: CreateExpenseCategoryData,
): ExpenseCategoryWithSyncMeta {
  const category = buildLocalExpenseCategory(payload);
  const persist = persistOfflineExpenseCategoryInBackground(category, payload, 'create').catch((err) => {
    console.error('[OfflineExpenseCategory] Background persist failed:', err);
  });
  trackWrite(persist);
  return category;
}

export function completeOfflineUpdateExpenseCategoryInstant(
  category: ExpenseCategory,
  payload: CreateExpenseCategoryData,
): ExpenseCategoryWithSyncMeta {
  const updated: ExpenseCategoryWithSyncMeta = {
    ...category,
    ...payload,
    description: payload.description ?? category.description,
    budget_amount: payload.budget_amount != null ? String(payload.budget_amount) : category.budget_amount,
    budget_period: payload.budget_period ?? category.budget_period,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  const persist = persistOfflineExpenseCategoryInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineExpenseCategory] Background persist failed:', err);
  });
  trackWrite(persist);
  return updated;
}

export function completeOfflineDeleteExpenseCategoryInstant(id: number): void {
  const category: ExpenseCategoryWithSyncMeta = {
    id,
    business_id: 0,
    name: '',
    description: null,
    sort_order: 0,
    budget_amount: null,
    budget_period: null,
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  const persist = persistOfflineExpenseCategoryInBackground(category, { id }, 'delete').catch((err) => {
    console.error('[OfflineExpenseCategory] Background persist failed:', err);
  });
  trackWrite(persist);
}

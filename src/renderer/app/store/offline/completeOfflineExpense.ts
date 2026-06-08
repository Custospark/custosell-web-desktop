import { queryClient } from '../../api/axiosConfig';
import { store } from '../store';
import { mutationQueue } from './mutationQueue';
import { localExpensesStore } from './localExpensesStore';
import { shouldCompleteMutationLocally } from './offlineQueryUtils';
import type {
  Expense,
  ExpenseCategory,
  ExpenseFormPayload,
  ExpenseReceiptPayload,
  ExpenseWithSyncMeta,
} from '../../../modules/expenses/api/ExpenseTypes';

const EXPENSE_CATEGORIES_KEY = ['expenses', 'categories'] as const;

export function shouldCompleteExpenseLocally(): boolean {
  return shouldCompleteMutationLocally();
}

function formValueToString(value: FormDataEntryValue): string {
  return typeof value === 'string' ? value : value.name;
}

function serializeReceipt(file: File): ExpenseReceiptPayload {
  return {
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
  };
}

export function serializeExpenseFormData(formData: FormData): ExpenseFormPayload {
  const fields: Record<string, string> = {};
  let receipt: ExpenseReceiptPayload | undefined;

  for (const [key, value] of formData.entries()) {
    if (key === 'receipt' && value instanceof File) {
      receipt = serializeReceipt(value);
      continue;
    }
    if (key === '_method') continue;
    fields[key] = formValueToString(value);
  }

  return { fields, receipt };
}

export function buildExpenseFormData(payload: ExpenseFormPayload, options?: { methodOverride?: 'PUT' }): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload.fields)) {
    if (value !== '') {
      formData.append(key, value);
    }
  }
  if (payload.receipt) {
    formData.append('receipt', payload.receipt.blob, payload.receipt.name);
  }
  if (options?.methodOverride) {
    formData.append('_method', options.methodOverride);
  }
  return formData;
}

function getSelectedCategory(categoryId: number | null): ExpenseCategory | null {
  if (!categoryId) return null;
  const categories = queryClient.getQueryData<ExpenseCategory[]>(EXPENSE_CATEGORIES_KEY);
  return categories?.find((category) => category.id === categoryId) ?? null;
}

function fieldAsBool(fields: Record<string, string>, key: string): boolean {
  const value = fields[key];
  return value === '1' || value === 'true';
}

export function buildLocalExpense(payload: ExpenseFormPayload): ExpenseWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;
  const categoryId = payload.fields.expense_category_id ? Number(payload.fields.expense_category_id) : null;

  const expense: Expense = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    expense_category_id: categoryId,
    expense_category: getSelectedCategory(categoryId),
    recorded_by: authUser?.id ?? null,
    recorded_by_user: authUser ? { data: { id: authUser.id, name: authUser.name, email: authUser.email } } : null,
    shift_id: payload.fields.shift_id ? Number(payload.fields.shift_id) : null,
    amount: payload.fields.amount ?? '0',
    description: payload.fields.description ?? '',
    reference: payload.fields.reference ?? null,
    receipt_url: null,
    is_recurring: fieldAsBool(payload.fields, 'is_recurring'),
    recurrence_interval: payload.fields.recurrence_interval ?? null,
    recurrence_end_date: payload.fields.recurrence_end_date ?? null,
    next_due_date: payload.fields.next_due_date ?? null,
    expense_date: payload.fields.expense_date ?? now,
    created_at: now,
    updated_at: now,
  };

  return { ...expense, _pendingSync: true, _pendingReceipt: Boolean(payload.receipt) };
}

export async function persistOfflineExpenseInBackground(
  expense: ExpenseWithSyncMeta,
  payload: ExpenseFormPayload | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'DELETE' = 'POST';
  let url = '/expenses';

  if (mutationType === 'create') {
    method = 'POST';
    url = '/expenses';
  } else if (mutationType === 'update') {
    method = 'POST';
    url = `/expenses/${expense.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/expenses/${(payload as { id: number }).id}`;
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      headers: mutationType === 'delete' ? undefined : { 'Content-Type': 'multipart/form-data' },
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineExpense] Enqueue failed:', err);
  }

  try {
    const localId = await localExpensesStore.save(expense, payload, mutationId, mutationType);
    expense._localId = localId;
  } catch (err) {
    console.error('[OfflineExpense] Local store save failed:', err);
  }
}

export function completeOfflineCreateExpenseInstant(formData: FormData): ExpenseWithSyncMeta {
  const payload = serializeExpenseFormData(formData);
  const expense = buildLocalExpense(payload);
  void persistOfflineExpenseInBackground(expense, payload, 'create').catch((err) => {
    console.error('[OfflineExpense] Background persist failed:', err);
  });
  return expense;
}

export function completeOfflineUpdateExpenseInstant(expense: Expense, formData: FormData): ExpenseWithSyncMeta {
  const payload = serializeExpenseFormData(formData);
  const updated: ExpenseWithSyncMeta = {
    ...expense,
    expense_category_id: payload.fields.expense_category_id ? Number(payload.fields.expense_category_id) : null,
    expense_category: getSelectedCategory(payload.fields.expense_category_id ? Number(payload.fields.expense_category_id) : null),
    shift_id: payload.fields.shift_id ? Number(payload.fields.shift_id) : expense.shift_id ?? null,
    amount: payload.fields.amount ?? expense.amount,
    description: payload.fields.description ?? expense.description,
    reference: payload.fields.reference ?? expense.reference,
    is_recurring: fieldAsBool(payload.fields, 'is_recurring'),
    recurrence_interval: payload.fields.recurrence_interval ?? null,
    recurrence_end_date: payload.fields.recurrence_end_date ?? null,
    next_due_date: payload.fields.next_due_date ?? null,
    expense_date: payload.fields.expense_date ?? expense.expense_date,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
    _pendingReceipt: Boolean(payload.receipt),
  };
  void persistOfflineExpenseInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineExpense] Background persist failed:', err);
  });
  return updated;
}

export function completeOfflineDeleteExpenseInstant(id: number): void {
  const expense: ExpenseWithSyncMeta = {
    id,
    business_id: 0,
    expense_category_id: null,
    expense_category: null,
    recorded_by: null,
    recorded_by_user: null,
    shift_id: null,
    amount: '0',
    description: '',
    reference: null,
    receipt_url: null,
    is_recurring: false,
    recurrence_interval: null,
    recurrence_end_date: null,
    next_due_date: null,
    expense_date: '',
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  void persistOfflineExpenseInBackground(expense, { id }, 'delete').catch((err) => {
    console.error('[OfflineExpense] Background persist failed:', err);
  });
}

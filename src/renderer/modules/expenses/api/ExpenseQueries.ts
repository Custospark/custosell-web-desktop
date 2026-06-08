import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { readWithOfflineStrategy } from '../../../app/store/offline/offlineReadStrategy';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../app/store/offline/offlineQueryUtils';
import { mutationQueue } from '../../../app/store/offline/mutationQueue';
import { localExpensesStore, toExpenseWithSyncMeta } from '../../../app/store/offline/localExpensesStore';
import {
  localExpenseCategoriesStore,
  toExpenseCategoryWithSyncMeta,
} from '../../../app/store/offline/localExpenseCategoriesStore';
import {
  buildExpenseFormData,
  completeOfflineCreateExpenseInstant,
  completeOfflineDeleteExpenseInstant,
  completeOfflineUpdateExpenseInstant,
  serializeExpenseFormData,
  shouldCompleteExpenseLocally,
} from '../../../app/store/offline/completeOfflineExpense';
import {
  completeOfflineCreateExpenseCategoryInstant,
  completeOfflineDeleteExpenseCategoryInstant,
  completeOfflineUpdateExpenseCategoryInstant,
  shouldCompleteExpenseCategoryLocally,
} from '../../../app/store/offline/completeOfflineExpenseCategory';
import type {
  Expense,
  ExpenseCategory,
  CreateExpenseCategoryData,
  ExpenseSummary,
  ExpenseWithSyncMeta,
  ExpenseCategoryWithSyncMeta,
} from './ExpenseTypes';

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters?: Record<string, string>) => [...expenseKeys.all, 'list', filters] as const,
  detail: (id: number) => [...expenseKeys.all, 'detail', id] as const,
  summary: (filters?: Record<string, string>) => [...expenseKeys.all, 'summary', filters] as const,
  categories: () => [...expenseKeys.all, 'categories'] as const,
};

async function loadLocalPendingExpenses(): Promise<ExpenseWithSyncMeta[]> {
  const pending = await localExpensesStore.getPending();
  return pending
    .filter((r) => r.mutationType !== 'delete')
    .map(toExpenseWithSyncMeta);
}

async function loadLocalPendingExpenseCategories(): Promise<ExpenseCategoryWithSyncMeta[]> {
  const pending = await localExpenseCategoriesStore.getPending();
  return pending
    .filter((r) => r.mutationType !== 'delete')
    .map(toExpenseCategoryWithSyncMeta);
}

function mergeExpenseLists(base: Expense[] = [], local: ExpenseWithSyncMeta[] = []): ExpenseWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Expense[];
  const safeLocal = local.filter(Boolean) as ExpenseWithSyncMeta[];
  const localIds = new Set(safeLocal.map((expense) => expense.id));
  const filtered = safeBase.filter((expense) => !localIds.has(expense.id));
  return [...safeLocal, ...filtered] as ExpenseWithSyncMeta[];
}

function matchesExpenseFilters(expense: ExpenseWithSyncMeta, filters?: Record<string, string>): boolean {
  if (!filters) return true;
  if (filters.category_id && String(expense.expense_category_id ?? '') !== filters.category_id) return false;
  if (filters.shift_id && String(expense.shift_id ?? '') !== filters.shift_id) return false;
  const expenseDate = (expense.expense_date ?? '').slice(0, 10);
  if (filters.date_from && expenseDate < filters.date_from.slice(0, 10)) return false;
  if (filters.date_to && expenseDate > filters.date_to.slice(0, 10)) return false;
  return true;
}

function mergeExpenseCategoryLists(
  base: ExpenseCategory[] = [],
  local: ExpenseCategoryWithSyncMeta[] = [],
): ExpenseCategoryWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as ExpenseCategory[];
  const safeLocal = local.filter(Boolean) as ExpenseCategoryWithSyncMeta[];
  const localIds = new Set(safeLocal.map((category) => category.id));
  const localNames = new Set(safeLocal.map((category) => category.name));
  const filtered = safeBase.filter((category) => !localIds.has(category.id) && !localNames.has(category.name));
  return [...safeLocal, ...filtered] as ExpenseCategoryWithSyncMeta[];
}

function sanitizeExpenseList(list: ExpenseWithSyncMeta[] = []): ExpenseWithSyncMeta[] {
  return list.filter(Boolean) as ExpenseWithSyncMeta[];
}

function sanitizeExpenseCategoryList(
  list: ExpenseCategoryWithSyncMeta[] = [],
): ExpenseCategoryWithSyncMeta[] {
  return list.filter(Boolean) as ExpenseCategoryWithSyncMeta[];
}

function getAllExpenseListQueries(qc: ReturnType<typeof useQueryClient>) {
  return qc.getQueriesData<ExpenseWithSyncMeta[]>({ queryKey: [...expenseKeys.all, 'list'] });
}

function patchExpenseLists(
  qc: ReturnType<typeof useQueryClient>,
  patch: (old: ExpenseWithSyncMeta[]) => ExpenseWithSyncMeta[],
): void {
  const queries = getAllExpenseListQueries(qc);
  for (const [key, data] of queries) {
    qc.setQueryData<ExpenseWithSyncMeta[]>(key, sanitizeExpenseList(patch(sanitizeExpenseList(data ?? []))));
  }
  if (queries.length === 0) {
    qc.setQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list(), sanitizeExpenseList(patch([])));
  }
}

function findCachedExpense(id: number): ExpenseWithSyncMeta | undefined {
  const lists = queryClient.getQueriesData<ExpenseWithSyncMeta[]>({ queryKey: [...expenseKeys.all, 'list'] });
  for (const [, data] of lists) {
    const match = sanitizeExpenseList(data ?? []).find((expense) => expense.id === id);
    if (match) return match;
  }
  return queryClient.getQueryData<ExpenseWithSyncMeta>(expenseKeys.detail(id));
}

function summarizeExpenses(expenses: ExpenseWithSyncMeta[]): ExpenseSummary {
  const byCategory = new Map<number | null, { category_id: number | null; category_name: string; total: number; count: number }>();
  let totalAmount = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount) || 0;
    totalAmount += amount;
    const key = expense.expense_category_id ?? null;
    const current = byCategory.get(key) ?? {
      category_id: key,
      category_name: expense.expense_category?.name ?? 'Uncategorized',
      total: 0,
      count: 0,
    };
    current.total += amount;
    current.count += 1;
    byCategory.set(key, current);
  }

  return {
    total_amount: totalAmount,
    total_count: expenses.length,
    by_category: Array.from(byCategory.values()),
  };
}

function mergeLocalExpensesIntoSummary(summary: ExpenseSummary, local: ExpenseWithSyncMeta[]): ExpenseSummary {
  if (local.length === 0) return summary;
  const merged = {
    ...summary,
    by_category: summary.by_category.map((item) => ({ ...item })),
  };

  for (const expense of local) {
    const amount = Number(expense.amount) || 0;
    merged.total_amount += amount;
    merged.total_count += 1;

    const categoryId = expense.expense_category_id ?? null;
    const existing = merged.by_category.find((item) => item.category_id === categoryId);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      merged.by_category.push({
        category_id: categoryId,
        category_name: expense.expense_category?.name ?? 'Uncategorized',
        total: amount,
        count: 1,
      });
    }
  }

  return merged;
}

function getExpenseErrorMessage(e: AxiosError, fallback: string): string {
  return sanitizeErrorMessage(e, fallback);
}

export function useExpenses(filters?: Record<string, string>, options?: { enabled?: boolean }) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<ExpenseWithSyncMeta[]>({
    queryKey: expenseKeys.list(filters),
    enabled: options?.enabled ?? true,
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<Expense[]>(expenseKeys.list(filters)) ?? [];
        const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
        return mergeExpenseLists(cached, local);
      },
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<{ data: Expense[] }>(`/expenses${params ? `?${params}` : ''}`, {
          timeout: 10000,
        });
        const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
        return mergeExpenseLists(data.data, local);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useExpense(id: number) {
  return useQuery<ExpenseWithSyncMeta>({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      if (id < 0) {
        const local = await localExpensesStore.getPending();
        const match = local.find((r) => r.expense.id === id);
        if (match) return toExpenseWithSyncMeta(match);
      }
      return readWithOfflineStrategy({
        readFromClient: async () => {
          const found = findCachedExpense(id);
          if (!found) throw new Error('Expense not available offline');
          return found;
        },
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get<{ data: Expense }>(`/expenses/${id}`, {
            timeout: 10000,
          });
          return data.data as ExpenseWithSyncMeta;
        },
      });
    },
    enabled: Boolean(id),
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useExpenseSummary(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<ExpenseSummary>({
    queryKey: expenseKeys.summary(filters),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<ExpenseSummary>(expenseKeys.summary(filters));
        if (cached) return cached;
        const expenses = queryClient.getQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list(filters)) ?? [];
        const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
        return summarizeExpenses(mergeExpenseLists(expenses, local));
      },
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<ExpenseSummary>(`/expenses/summary${params ? `?${params}` : ''}`, {
          timeout: 10000,
        });
        const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
        return mergeLocalExpensesIntoSummary(data, local);
      },
    }),
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useExpenseCategories() {
  return useQuery<ExpenseCategoryWithSyncMeta[]>({
    queryKey: expenseKeys.categories(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<ExpenseCategory[]>(expenseKeys.categories()) ?? [];
        const local = await loadLocalPendingExpenseCategories();
        return mergeExpenseCategoryLists(cached, local);
      },
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<{ data: ExpenseCategory[] }>('/expense-categories', {
          timeout: 10000,
        });
        const local = await loadLocalPendingExpenseCategories();
        return mergeExpenseCategoryLists(data.data, local);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: expenseKeys.all });
  qc.invalidateQueries({ queryKey: expenseKeys.categories() });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseWithSyncMeta, AxiosError, FormData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (formData) => {
      if (shouldCompleteExpenseLocally()) {
        return completeOfflineCreateExpenseInstant(formData);
      }
      try {
        const { data: res } = await axiosInstance.post<{ data: Expense }>('/expenses', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10000,
        });
        return res.data as ExpenseWithSyncMeta;
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          return completeOfflineCreateExpenseInstant(formData);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
    },
    onSuccess: (expense) => {
      if (!expense) {
        invalidateAll(qc);
        return;
      }
      if (expense._pendingSync) {
        patchExpenseLists(qc, (old) => {
          if (old.some((item) => item.id === expense.id)) return old;
          return [expense, ...old];
        });
        qc.setQueryData(expenseKeys.detail(expense.id), expense);
        showToast('success', 'Expense saved — will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e) => {
      showToast('error', getExpenseErrorMessage(e, 'Failed to record expense'));
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseWithSyncMeta, AxiosError, { id: number; data: FormData }, { previous?: ExpenseWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const existing = findCachedExpense(id);
      if (!existing) throw new Error('Expense not found');
      if (existing._pendingSync || id < 0) {
        throw new Error('Sync this expense before editing');
      }
      if (shouldCompleteExpenseLocally()) {
        return completeOfflineUpdateExpenseInstant(existing, data);
      }
      try {
        const payload = serializeExpenseFormData(data);
        const formData = buildExpenseFormData(payload, { methodOverride: 'PUT' });
        const { data: res } = await axiosInstance.post<{ data: Expense }>(`/expenses/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10000,
        });
        return res.data as ExpenseWithSyncMeta;
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          return completeOfflineUpdateExpenseInstant(existing, data);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
      const previous = sanitizeExpenseList(qc.getQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list()) ?? []);
      return { previous };
    },
    onSuccess: (expense, { id }) => {
      if (!expense) {
        invalidateAll(qc);
        return;
      }
      if (expense._pendingSync) {
        patchExpenseLists(qc, (old) => old.map((item) => item.id === id ? expense : item));
        qc.setQueryData(expenseKeys.detail(id), expense);
        showToast('success', 'Changes saved — will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      showToast('error', getExpenseErrorMessage(e, 'Failed to update expense'));
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: ExpenseWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const existing = findCachedExpense(id);
      if (existing?._pendingSync || id < 0) {
        const mutationId = await localExpensesStore.removeByExpenseId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }
      if (shouldCompleteExpenseLocally()) {
        completeOfflineDeleteExpenseInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`/expenses/${id}`, { timeout: 10000 });
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          completeOfflineDeleteExpenseInstant(id);
          return;
        }
        throw err;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
      const previous = sanitizeExpenseList(qc.getQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list()) ?? []);
      qc.setQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list(), previous.filter((e) => e.id !== id));
      return { previous };
    },
    onSuccess: (_data, id) => {
      patchExpenseLists(qc, (old) => old.filter((expense) => expense.id !== id));
      qc.removeQueries({ queryKey: expenseKeys.detail(id) });
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      showToast('error', getExpenseErrorMessage(e, 'Failed to delete expense'));
    },
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseCategoryWithSyncMeta, AxiosError, CreateExpenseCategoryData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (shouldCompleteExpenseCategoryLocally()) {
        return completeOfflineCreateExpenseCategoryInstant(payload);
      }
      try {
        const { data } = await axiosInstance.post<{ data: ExpenseCategory }>('/expense-categories', payload, {
          timeout: 10000,
        });
        return data.data as ExpenseCategoryWithSyncMeta;
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          return completeOfflineCreateExpenseCategoryInstant(payload);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
    },
    onSuccess: (category) => {
      if (!category) {
        invalidateAll(qc);
        return;
      }
      if (category._pendingSync) {
        qc.setQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories(), (old) => {
          const list = sanitizeExpenseCategoryList(old ?? []);
          if (list.some((item) => item.id === category.id || item.name === category.name)) return list;
          return [category, ...list];
        });
        showToast('success', 'Category saved — will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e) => {
      showToast('error', getExpenseErrorMessage(e, 'Failed to create category'));
    },
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseCategoryWithSyncMeta, AxiosError, { id: number; data: CreateExpenseCategoryData }, { previous?: ExpenseCategoryWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const existing = sanitizeExpenseCategoryList(
        queryClient.getQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories()) ?? [],
      ).find((category) => category.id === id);
      if (!existing) throw new Error('Category not found');
      if (existing._pendingSync || id < 0) {
        throw new Error('Sync this category before editing');
      }
      if (shouldCompleteExpenseCategoryLocally()) {
        return completeOfflineUpdateExpenseCategoryInstant(existing, data);
      }
      try {
        const { data: res } = await axiosInstance.put<{ data: ExpenseCategory }>(`/expense-categories/${id}`, data, {
          timeout: 10000,
        });
        return res.data as ExpenseCategoryWithSyncMeta;
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          return completeOfflineUpdateExpenseCategoryInstant(existing, data);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
      const previous = sanitizeExpenseCategoryList(
        qc.getQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories()) ?? [],
      );
      return { previous };
    },
    onSuccess: (category, { id }) => {
      if (!category) {
        invalidateAll(qc);
        return;
      }
      if (category._pendingSync) {
        qc.setQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories(), (old) =>
          sanitizeExpenseCategoryList(old ?? []).map((item) => item.id === id ? category : item),
        );
        showToast('success', 'Changes saved — will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', getExpenseErrorMessage(e, 'Failed to update category'));
    },
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: ExpenseCategoryWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const category = sanitizeExpenseCategoryList(
        queryClient.getQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories()) ?? [],
      ).find((item) => item.id === id);
      if (category?._pendingSync || id < 0) {
        const mutationId = await localExpenseCategoriesStore.removeByCategoryId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }
      if (shouldCompleteExpenseCategoryLocally()) {
        completeOfflineDeleteExpenseCategoryInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`/expense-categories/${id}`, { timeout: 10000 });
      } catch (err: unknown) {
        if (isNetworkFailure(err)) {
          completeOfflineDeleteExpenseCategoryInstant(id);
          return;
        }
        throw err;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
      const previous = sanitizeExpenseCategoryList(
        qc.getQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories()) ?? [],
      );
      qc.setQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories(), previous.filter((c) => c.id !== id));
      return { previous };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<ExpenseCategoryWithSyncMeta[]>(expenseKeys.categories(), (old) =>
        sanitizeExpenseCategoryList(old ?? []).filter((category) => category.id !== id),
      );
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', getExpenseErrorMessage(e, 'Failed to delete category'));
    },
  });
}

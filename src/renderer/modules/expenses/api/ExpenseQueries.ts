import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { readWithOfflineStrategy } from '../../../app/store/offline/core/offlineReadStrategy';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { mutationQueue } from '../../../app/store/offline/sync/mutationQueue';
import { localExpensesStore, toExpenseWithSyncMeta } from '../../../app/store/offline/expenses/localExpensesStore';
import {
  localExpenseCategoriesStore,
  toExpenseCategoryWithSyncMeta,
} from '../../../app/store/offline/expenses/localExpenseCategoriesStore';
import {
  buildExpenseFormData,
  completeOfflineCreateExpenseInstant,
  completeOfflineDeleteExpenseInstant,
  completeOfflineUpdateExpenseInstant,
  serializeExpenseFormData,
  shouldCompleteExpenseLocally,
} from '../../../app/store/offline/expenses/completeOfflineExpense';
import {
  completeOfflineCreateExpenseCategoryInstant,
  completeOfflineDeleteExpenseCategoryInstant,
  completeOfflineUpdateExpenseCategoryInstant,
  shouldCompleteExpenseCategoryLocally,
} from '../../../app/store/offline/expenses/completeOfflineExpenseCategory';
import { shiftKeys } from '../../shifts/ShiftQueries';
import { expenseKeys } from '../../../shared/utils/expenseKeys';
import { budgetKeys } from './BudgetQueries';
import { dashboardKeys } from '../../dashboard/DashboardQueries'
import {
  applyExpenseDeleteOptimisticUpdates,
  applyExpenseOptimisticUpdates,
  findCachedExpense,
  mergeExpenseCategoryLists,
  mergeExpenseLists,
  mergeLocalExpensesIntoSummary,
  sanitizeExpenseCategoryList,
  sanitizeExpenseList,
  summarizeExpenses,
  matchesExpenseFilters,
} from '../../../shared/utils/expenseCacheUtils';
import {
  backupExpenseCategoriesSnapshot,
  backupExpensesListSnapshot,
  loadExpenseCategoriesBaseline,
  loadExpensesListBaseline,
  refreshExpenseCategoriesSnapshot,
} from '../../../app/store/offline/catalogs/expensesCatalogSnapshot';
import { readCatalogBaseline, resolveAuthBusinessId } from '../../../app/store/offline/catalogs/catalogSnapshotUtils';
import type {
  Expense,
  ExpenseCategory,
  CreateExpenseCategoryData,
  ExpenseSummary,
  ExpenseWithSyncMeta,
  ExpenseCategoryWithSyncMeta,
} from './ExpenseTypes';

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

async function readExpensesListFromClient(filters?: Record<string, string>): Promise<ExpenseWithSyncMeta[]> {
  const baseline = await readCatalogBaseline(
    'expenses',
    expenseKeys.list(filters),
    loadExpensesListBaseline,
  );
  const filteredBaseline = baseline.filter((expense) =>
    matchesExpenseFilters(expense as ExpenseWithSyncMeta, filters),
  );
  const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
  return mergeExpenseLists(filteredBaseline, local);
}

export function useExpenses(filters?: Record<string, string>, options?: { enabled?: boolean }) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  const hasFilters = Boolean(filters && Object.keys(filters).length > 0);
  return useQuery<ExpenseWithSyncMeta[]>({
    queryKey: expenseKeys.list(filters),
    enabled: options?.enabled ?? true,
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: () => readExpensesListFromClient(filters),
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<{ data: Expense[] }>(`/expenses${params ? `?${params}` : ''}`);
        const serverList = data.data ?? [];
        const businessId = resolveAuthBusinessId();
        if (businessId && !hasFilters) {
          backupExpensesListSnapshot(businessId, serverList);
        }
        const local = (await loadLocalPendingExpenses()).filter((expense) => matchesExpenseFilters(expense, filters));
        return mergeExpenseLists(serverList, local);
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
          const { data } = await axiosInstance.get<{ data: Expense }>(`/expenses/${id}`);
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
        const expenses = await readExpensesListFromClient(filters);
        return summarizeExpenses(expenses);
      },
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<ExpenseSummary>(`/expenses/summary${params ? `?${params}` : ''}`);
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
        const baseline = await readCatalogBaseline(
          'expenseCategories',
          expenseKeys.categories(),
          loadExpenseCategoriesBaseline,
        );
        const local = await loadLocalPendingExpenseCategories();
        return mergeExpenseCategoryLists(baseline, local);
      },
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get<{ data: ExpenseCategory[] }>('/expense-categories');
        const serverList = data.data ?? [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupExpenseCategoriesSnapshot(businessId, serverList);
        }
        const local = await loadLocalPendingExpenseCategories();
        return mergeExpenseCategoryLists(serverList, local);
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
  qc.invalidateQueries({ queryKey: budgetKeys.all });
  qc.invalidateQueries({ queryKey: shiftKeys.all });
  qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
  qc.invalidateQueries({ queryKey: dashboardKeys.branchPerformance() });
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
        });
        return res.data as ExpenseWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteExpenseLocally()) {
          return completeOfflineCreateExpenseInstant(formData);
        }
        throw err;
      }
    },
    onSuccess: (expense) => {
      if (!expense) {
        invalidateAll(qc);
        return;
      }
      if (expense._pendingSync) {
        applyExpenseOptimisticUpdates(qc, expense, 'create');
        showToast('success', 'Expense saved - will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to record expense'));
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
        });
        return res.data as ExpenseWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteExpenseLocally()) {
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
      const previousShiftId = findCachedExpense(id)?.shift_id;
      if (expense._pendingSync) {
        applyExpenseOptimisticUpdates(qc, expense, 'update', previousShiftId);
        showToast('success', 'Changes saved - will sync when online');
      } else {
        invalidateAll(qc);
      }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      showToast('error', sanitizeErrorMessage(e, 'Failed to update expense'));
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: ExpenseWithSyncMeta[]; removed?: ExpenseWithSyncMeta }>({
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
        await axiosInstance.delete(`/expenses/${id}`);
      } catch (err: unknown) {
        if (shouldCompleteExpenseLocally()) {
          completeOfflineDeleteExpenseInstant(id);
          return;
        }
        throw err;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
      const existing = findCachedExpense(id);
      const previous = sanitizeExpenseList(qc.getQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list()) ?? []);
      applyExpenseDeleteOptimisticUpdates(qc, id, existing?.shift_id);
      return { previous, removed: existing };
    },
    onSuccess: () => {
      invalidateAll(qc);
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      if (ctx?.removed) {
        applyExpenseOptimisticUpdates(qc, ctx.removed, 'create');
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete expense'));
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
        const { data } = await axiosInstance.post<{ data: ExpenseCategory }>('/expense-categories', payload);
        return data.data as ExpenseCategoryWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteExpenseCategoryLocally()) {
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
        showToast('success', 'Category saved - will sync when online');
      } else {
        void refreshExpenseCategoriesSnapshot();
        invalidateAll(qc);
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create category'));
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
        const { data: res } = await axiosInstance.put<{ data: ExpenseCategory }>(`/expense-categories/${id}`, data);
        return res.data as ExpenseCategoryWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteExpenseCategoryLocally()) {
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
        showToast('success', 'Changes saved - will sync when online');
      } else {
        void refreshExpenseCategoriesSnapshot();
        invalidateAll(qc);
      }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', sanitizeErrorMessage(e, 'Failed to update category'));
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
        await axiosInstance.delete(`/expense-categories/${id}`);
      } catch (err: unknown) {
        if (shouldCompleteExpenseCategoryLocally()) {
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
      void refreshExpenseCategoriesSnapshot();
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete category'));
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import type { Expense, ExpenseCategory, CreateExpenseCategoryData, ExpenseSummary } from './ExpenseTypes';

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters?: Record<string, string>) => [...expenseKeys.all, 'list', filters] as const,
  detail: (id: number) => [...expenseKeys.all, 'detail', id] as const,
  summary: (filters?: Record<string, string>) => [...expenseKeys.all, 'summary', filters] as const,
  categories: () => [...expenseKeys.all, 'categories'] as const,
};

export function useExpenses(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<Expense[]>({
    queryKey: expenseKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Expense[] }>(`/expenses${params ? `?${params}` : ''}`);
      return data.data;
    },
  });
}

export function useExpense(id: number) {
  return useQuery<Expense>({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Expense }>(`/expenses/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useExpenseSummary(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<ExpenseSummary>({
    queryKey: expenseKeys.summary(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ExpenseSummary>(`/expenses/summary${params ? `?${params}` : ''}`);
      return data;
    },
  });
}

export function useExpenseCategories() {
  return useQuery<ExpenseCategory[]>({
    queryKey: expenseKeys.categories(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: ExpenseCategory[] }>('/expense-categories');
      return data.data;
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: expenseKeys.all });
  qc.invalidateQueries({ queryKey: expenseKeys.categories() });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Expense, AxiosError, FormData>({
    mutationFn: async (formData) => {
      const { data: res } = await axiosInstance.post<{ data: Expense }>('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
    },
    onError: (e) => {
      showToast('error', (e.response?.data as any)?.message || 'Failed to record expense');
    },
    onSettled: () => invalidateAll(qc),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Expense, AxiosError, { id: number; data: FormData }, { previous?: Expense[] }>({
    mutationFn: async ({ id, data }) => {
      data.append('_method', 'PUT');
      const { data: res } = await axiosInstance.post<{ data: Expense }>(`/expenses/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
      const previous = qc.getQueryData<Expense[]>(expenseKeys.list());
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      showToast('error', (e.response?.data as any)?.message || 'Failed to update expense');
    },
    onSettled: () => invalidateAll(qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: Expense[] }>({
    mutationFn: async (id) => {
      await axiosInstance.delete(`/expenses/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expenseKeys.all });
      const previous = qc.getQueryData<Expense[]>(expenseKeys.list());
      if (previous) {
        qc.setQueryData<Expense[]>(expenseKeys.list(), previous.filter((e) => e.id !== id));
      }
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.list(), ctx.previous);
      showToast('error', (e.response?.data as any)?.message || 'Failed to delete expense');
    },
    onSettled: () => invalidateAll(qc),
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseCategory, AxiosError, CreateExpenseCategoryData>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: ExpenseCategory }>('/expense-categories', payload);
      return data.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
    },
    onError: (e) => {
      showToast('error', (e.response?.data as any)?.message || 'Failed to create category');
    },
    onSettled: () => invalidateAll(qc),
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ExpenseCategory, AxiosError, { id: number; data: CreateExpenseCategoryData }, { previous?: ExpenseCategory[] }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.put<{ data: ExpenseCategory }>(`/expense-categories/${id}`, data);
      return res.data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
      const previous = qc.getQueryData<ExpenseCategory[]>(expenseKeys.categories());
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', (e.response?.data as any)?.message || 'Failed to update category');
    },
    onSettled: () => invalidateAll(qc),
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: ExpenseCategory[] }>({
    mutationFn: async (id) => {
      await axiosInstance.delete(`/expense-categories/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expenseKeys.categories() });
      const previous = qc.getQueryData<ExpenseCategory[]>(expenseKeys.categories());
      if (previous) {
        qc.setQueryData<ExpenseCategory[]>(expenseKeys.categories(), previous.filter((c) => c.id !== id));
      }
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(expenseKeys.categories(), ctx.previous);
      showToast('error', (e.response?.data as any)?.message || 'Failed to delete category');
    },
    onSettled: () => invalidateAll(qc),
  });
}

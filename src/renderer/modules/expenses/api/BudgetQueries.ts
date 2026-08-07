import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { BUDGETS } from '../../../shared/api/endpoints/endpoints';
import type {
  PersonalBudget,
  PersonalBudgetSummaries,
  PersonalBudgetSummaryRow,
  CreateBudgetData,
  UpdateBudgetData,
} from './BudgetTypes';

export const budgetKeys = {
  all: ['personal-budgets'] as const,
  list: () => [...budgetKeys.all, 'list'] as const,
  detail: (id: number) => [...budgetKeys.all, 'detail', id] as const,
};

export function useBudgetsIndex(filters?: { status?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: [...budgetKeys.list(), filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.date_from) params.set('date_from', filters.date_from);
      if (filters?.date_to) params.set('date_to', filters.date_to);
      const query = params.toString();
      const { data } = await axiosInstance.get<PersonalBudgetSummaries>(`${BUDGETS.BASE}${query ? `?${query}` : ''}`);
      return data;
    },
  });
}

export function useBudget(id: number) {
  return useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PersonalBudget }>(BUDGETS.BY_ID(id));
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation<PersonalBudget, AxiosError, CreateBudgetData>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: PersonalBudget }>(BUDGETS.BASE, payload);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation<PersonalBudget, AxiosError, { id: number; data: UpdateBudgetData }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.put<{ data: PersonalBudget }>(BUDGETS.BY_ID(id), data);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(BUDGETS.BY_ID(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export type { PersonalBudgetSummaries, PersonalBudgetSummaryRow, PersonalBudget, CreateBudgetData, UpdateBudgetData };
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { INCOME_SOURCES } from '../../../shared/api/endpoints/endpoints';
import { EXPENSES } from '../../../shared/api/endpoints/endpoints';
import type { IncomeSource, CreateIncomeData, UpdateIncomeData, OverviewData, IncomeAttachment, BudgetData } from './IncomeTypes';
import { budgetKeys } from './BudgetQueries';

export const incomeKeys = {
  all: ['income-sources'] as const,
  list: () => [...incomeKeys.all, 'list'] as const,
  detail: (id: number) => [...incomeKeys.all, 'detail', id] as const,
  overview: () => ['expenses', 'overview'] as const,
  budgets: () => ['expenses', 'budgets'] as const,
};

export function useIncomeSources() {
  return useQuery({
    queryKey: incomeKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: IncomeSource[] }>(INCOME_SOURCES);
      return data.data;
    },
  });
}

export function useIncomeSource(id: number) {
  return useQuery({
    queryKey: incomeKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: IncomeSource }>(`${INCOME_SOURCES}/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useBudgets(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...incomeKeys.budgets(), { dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await axiosInstance.get<BudgetData>(`${EXPENSES}/budgets?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export type OverviewPeriod = 'thisMonth' | 'lastMonth' | 'thisYear';

function overviewRange(period: OverviewPeriod): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'thisYear') {
    return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
  }
  const target = period === 'lastMonth' ? new Date(y, m - 1, 1) : new Date(y, m, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dateFrom: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-01`,
    dateTo: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(lastDay)}`,
  };
}

export function useIncomeOverview(period: OverviewPeriod = 'thisMonth', locationId?: number) {
  const { dateFrom, dateTo } = overviewRange(period);
  return useQuery({
    queryKey: [...incomeKeys.overview(), { period, locationId }],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (locationId) params.set('location_id', String(locationId));
      const { data } = await axiosInstance.get<OverviewData>(`${EXPENSES}/overview?${params}`);
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation<IncomeSource, AxiosError, CreateIncomeData>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: IncomeSource }>(INCOME_SOURCES, payload);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.all });
      void qc.invalidateQueries({ queryKey: incomeKeys.overview() });
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation<IncomeSource, AxiosError, { id: number; data: UpdateIncomeData }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.put<{ data: IncomeSource }>(`${INCOME_SOURCES}/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.all });
      void qc.invalidateQueries({ queryKey: incomeKeys.overview() });
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(`${INCOME_SOURCES}/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.all });
      void qc.invalidateQueries({ queryKey: incomeKeys.overview() });
    },
  });
}

export function useUploadIncomeAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incomeSourceId, file }: { incomeSourceId: number; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosInstance.post(`${INCOME_SOURCES}/${incomeSourceId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as IncomeAttachment;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: incomeKeys.detail(variables.incomeSourceId) });
      void qc.invalidateQueries({ queryKey: incomeKeys.list() });
    },
  });
}

export function useCreateIncomeAttachmentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incomeSourceId, url, title }: { incomeSourceId: number; url: string; title?: string }) => {
      const { data } = await axiosInstance.post(`${INCOME_SOURCES}/${incomeSourceId}/attachments/link`, { url, title });
      return data.data as IncomeAttachment;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: incomeKeys.detail(variables.incomeSourceId) });
      void qc.invalidateQueries({ queryKey: incomeKeys.list() });
    },
  });
}

export function useDeleteIncomeAttachment(incomeSourceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/income-source-attachments/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.detail(incomeSourceId) });
      void qc.invalidateQueries({ queryKey: incomeKeys.list() });
    },
  });
}

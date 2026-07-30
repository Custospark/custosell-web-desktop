import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { INCOME_SOURCES } from '../../../shared/api/endpoints/endpoints';
import { EXPENSES } from '../../../shared/api/endpoints/endpoints';
import type { IncomeSource, CreateIncomeData, UpdateIncomeData, OverviewData, IncomeAttachment } from './IncomeTypes';

export const incomeKeys = {
  all: ['income-sources'] as const,
  list: () => [...incomeKeys.all, 'list'] as const,
  detail: (id: number) => [...incomeKeys.all, 'detail', id] as const,
  overview: () => ['expenses', 'overview'] as const,
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

export function useIncomeOverview() {
  return useQuery({
    queryKey: incomeKeys.overview(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<OverviewData>(`${EXPENSES}/overview`);
      return data;
    },
    staleTime: 30_000,
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

export function useUploadIncomeAttachment(incomeSourceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosInstance.post(`${INCOME_SOURCES}/${incomeSourceId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as IncomeAttachment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.detail(incomeSourceId) });
      void qc.invalidateQueries({ queryKey: incomeKeys.list() });
    },
  });
}

export function useCreateIncomeAttachmentLink(incomeSourceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, title }: { url: string; title?: string }) => {
      const { data } = await axiosInstance.post(`${INCOME_SOURCES}/${incomeSourceId}/attachments/link`, { url, title });
      return data.data as IncomeAttachment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incomeKeys.detail(incomeSourceId) });
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

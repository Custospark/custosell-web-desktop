import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import type { Sale, CreateSalePayload, RefundData } from './salesTypes';

export const salesKeys = {
  all: ['sales'] as const,
  list: () => [...salesKeys.all, 'list'] as const,
  daily: (date?: string) => [...salesKeys.all, 'daily', date] as const,
  detail: (id: number) => [...salesKeys.all, 'detail', id] as const,
};

export function useCustomers() {
  return useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: any[] }>('/customers');
      return data.data;
    },
  });
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: salesKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Sale[] }>('/sales');
      return data.data;
    },
  });
}

export function useDailySales(date?: string) {
  return useQuery<Sale[]>({
    queryKey: salesKeys.daily(date),
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/daily${params}`);
      return data.data;
    },
  });
}

export function useSale(id: number) {
  return useQuery<Sale>({
    queryKey: salesKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Sale }>(`/sales/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Sale, AxiosError, CreateSalePayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: Sale }>('/sales', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
      showToast('success', 'Sale completed');
    },
    onError: (e) => {
      showToast('error', (e.response?.data as any)?.message || 'Sale failed');
    },
  });
}

export function useRefund() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Sale, AxiosError, { id: number; data: RefundData }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.post<{ data: Sale }>(`/sales/${id}/refund`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
      showToast('success', 'Refund processed');
    },
    onError: (e) => {
      showToast('error', (e.response?.data as any)?.message || 'Refund failed');
    },
  });
}

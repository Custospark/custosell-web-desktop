import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { store } from '../../app/store/store';
import { useToast } from '../../app/contexts/useToast';
import { localSalesStore, toSaleWithSyncMeta } from '../../app/store/offline/localSalesStore';
import type { Sale } from '../sales/api/salesTypes';

function isOfflineMode(): boolean {
  const state = store.getState();
  return (state as { network?: { systemStatus?: string } }).network?.systemStatus === 'offline';
}

function mergeShiftSales(server: Sale[], shiftId: number) {
  return localSalesStore.getByShiftId(shiftId).then((local) => {
    const localSales = local.map(toSaleWithSyncMeta);
    const localReceipts = new Set(localSales.map((s) => s.receipt_number));
    const filtered = server.filter((s) => !localReceipts.has(s.receipt_number));
    const merged = [...localSales, ...filtered];
    merged.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    return merged;
  });
}

export interface Shift {
  id: number;
  business_id: number;
  user_id: number;
  user?: { data: { id: number; name: string } };
  clock_in: string;
  clock_out: string | null;
  total_sales: string;
  total_cash: string;
  total_mobile_money: string;
  total_card: string;
  status: 'active' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const shiftKeys = {
  all: ['shifts'] as const,
  active: () => [...shiftKeys.all, 'active'] as const,
  list: () => [...shiftKeys.all, 'list'] as const,
};

export function useActiveShift() {
  return useQuery<Shift | null>({
    queryKey: shiftKeys.active(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ data: Shift }>('/shifts/active');
      if (!response.data || !response.data.data) return null;
      return response.data.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });
}

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: shiftKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Shift[] }>('/shifts');
      return data.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useShiftSales(shiftId: number | null) {
  return useQuery<Sale[]>({
    queryKey: [...shiftKeys.all, 'sales', shiftId] as const,
    queryFn: async () => {
      if (!shiftId) return [];

      if (isOfflineMode()) {
        const cached = queryClient.getQueryData<Sale[]>([...shiftKeys.all, 'sales', shiftId]) ?? [];
        return mergeShiftSales(cached, shiftId);
      }

      try {
        const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/by-shift/${shiftId}`);
        return mergeShiftSales(data.data, shiftId);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response) throw err;
        const cached = queryClient.getQueryData<Sale[]>([...shiftKeys.all, 'sales', shiftId]) ?? [];
        return mergeShiftSales(cached, shiftId);
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: !!shiftId,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Shift, AxiosError>({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<{ data: Shift }>('/shifts', {
        clock_in: new Date().toISOString(),
        status: 'active',
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftKeys.all });
      showToast('success', 'Shift started');
    },
    onError: () => showToast('error', 'Failed to start shift'),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Shift, AxiosError, { id: number; totals: Record<string, number> }>({
    mutationFn: async ({ id, totals }) => {
      const { data } = await axiosInstance.put<{ data: Shift }>(`/shifts/${id}`, {
        clock_out: new Date().toISOString(),
        status: 'completed',
        total_sales: totals.total_sales,
        total_cash: totals.cash,
        total_mobile_money: totals.mobile_money,
        total_card: totals.card,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftKeys.all });
      showToast('success', 'Shift ended');
    },
    onError: () => showToast('error', 'Failed to end shift'),
  });
}

